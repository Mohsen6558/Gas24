<?php

namespace app\controllers;

use app\components\Helper;
use app\components\RestCaptcha;
use app\components\SMSHelper;
use app\models\AppNotification;
use app\models\City;
use app\models\Data;
use app\models\Gabz;
use app\models\Lognew2;
use app\models\OptimizeHint;
use app\models\OptimizeHintSeen;
use app\models\OptimizeKarkard;
use app\models\OptimizeKeyNo;
use app\models\OptimizeMasraf;
use app\models\OptimizeReward;
use app\models\OptimizeRewardUsed;
use app\models\OptimizeToken;
use app\models\OTP;
use Yii;

class WsOptimizeController extends \yii\rest\Controller
{
    
    public $enableCsrfValidation = false;

    
    public $userMobNo = null;
    

    public function behaviors()
    {
        $behaviors = parent::behaviors();

        
        unset($behaviors['authenticator']);

        
        $behaviors['corsFilter'] = [
            'class' => \yii\filters\Cors::class,
            'cors' => [
                'Origin' => [
                    '*',
                ],
                'Access-Control-Allow-Credentials' => true,
                'Access-Control-Request-Method' => ['GET', 'POST', 'OPTIONS'],
                'Access-Control-Allow-Headers' => ['Origin', 'Content-Type', 'Authorization', 'Accept'],
                'Access-Control-Expose-Headers' => ['Authorization'],
                'Access-Control-Max-Age' => 86400,
            ]
        ];

        
        $behaviors['authenticator'] = [
            'class' => \yii\filters\auth\CompositeAuth::class,
            'authMethods' => [
                
                ['class' => \yii\filters\auth\HttpBearerAuth::class],
            ],
            'except' => [
                'options',
                'send-otp',
                'check-otp',
                'generate-captcha',
                'validate-captcha',
            ],
        ];

        return $behaviors;
    }

    public function beforeAction($action)
    {
        if (!parent::beforeAction($action)) {
            return false;
        }

        
        $publicActions = ['send-otp', 'check-otp', 'generate-captcha', 'validate-captcha', 'options', 'city-list'];
        if (in_array($action->id, $publicActions)) {
            return true;
        }

        
        
        $this->userMobNo = Yii::$app->user->identity->MobNo;

        return true;
    }



    public function actionGenerateCaptcha() 
    {
        $tmparray = array();
        $tmparray['image'] = (new RestCaptcha())->generateImage();
        return $tmparray;

    }


    public function actionValidateCaptcha() 
    {

        $data = Yii::$app->request->getRawBody();
        if (!empty($data)) {
            $data = json_decode($data, true);
        }

        $code = $data['code'] ?? null;
        if (empty($code)) {
            $tmparray['type'] = "empty code";
            $tmparray['success'] = false;
            return $tmparray;
        }


        if ((new RestCaptcha())->verify($code) == true){
            $tmparray['success'] = true;
            return $tmparray;
        }

        $tmparray['type'] = "invalid";
        $tmparray['success'] = false;
        return $tmparray;

    }

    
    
    

    
    public function actionRedeemReward() 
    {
        $data = Yii::$app->request->getRawBody();
        if (!empty($data)) {
            $data = json_decode($data, true);
        }

        $keyNo = $data['keyNo'] ?? null;
        $mobNo = $this->userMobNo;
        $rewardId = $data['rewardId'] ?? null;

        
        if (empty($keyNo) || empty($mobNo) || empty($rewardId)) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'اطلاعات ارسالی (شماره اشتراک، موبایل یا شناسه جایزه) ناقص است.'
            ];
        }


        $ownershipCheck = $this->checkKeyNoOwnership($keyNo);
        if (is_array($ownershipCheck) && isset($ownershipCheck['success']) && $ownershipCheck['success'] === false) {
            return $ownershipCheck;
        }

        if (!\app\components\Helper::isMobNoValid($mobNo)) {
            return [
                'success' => false,
                'type' => "invalidMobNo",
                'message' => 'شماره موبایل نامعتبر است.'
            ];
        }

        
        $reward = OptimizeReward::findOne($rewardId);
        if (!$reward) {
            return [
                'success' => false,
                'type' => "notFound",
                'message' => 'جایزه مورد نظر یافت نشد.'
            ];
        }

        $now = time();
        if (($reward->StartDate && $now < $reward->StartDate) || ($reward->EndDate && $now > $reward->EndDate)) {
            return [
                'success' => false,
                'type' => "expired",
                'message' => 'این جایزه در حال حاضر فعال نیست یا زمان دریافت آن به پایان رسیده است.'
            ];
        }

        
        if ($reward->Type == 1) {
            $alreadyUsed = OptimizeRewardUsed::find()
                ->where(['RewardID' => $rewardId, 'KeyNo' => $keyNo])
                ->exists();

            if ($alreadyUsed) {
                return [
                    'success' => false,
                    'type' => "alreadyRedeemed",
                    'message' => 'شما قبلاً این جایزه را دریافت کرده‌اید و فقط یک‌بار قابل استفاده است.'
                ];
            }
        }

        
        $user = OptimizeKeyNo::findOne($keyNo);
        if (!$user) {
            return [
                'success' => false,
                'type' => "userNotFound",
                'message' => 'شماره اشتراک در سیستم یافت نشد.'
            ];
        }

        if ($user->Token < $reward->Token) {
            return [
                'success' => false,
                'type' => "insufficientTokens",
                'message' => 'امتیاز شما برای دریافت این جایزه کافی نیست.'
            ];
        }

        
        $availableSlot = OptimizeRewardUsed::find()
            ->where(['RewardID' => $rewardId])
            ->andWhere(['or', ['is', 'KeyNo', null], ['KeyNo' => 0]])
            ->one();

        if (!$availableSlot) {
            return [
                'success' => false,
                'type' => "outOfStock",
                'message' => 'متأسفانه ظرفیت این جایزه به اتمام رسیده است.'
            ];
        }

        
        $transaction = Yii::$app->db->beginTransaction();

        try {
            
            $availableSlot->KeyNo = $keyNo;
            $availableSlot->MobNo = $mobNo;
            $availableSlot->AssigneeDate = Helper::getNowUnixtime();


            if (!$availableSlot->save()) {
                throw new \Exception('خطا در ذخیره اطلاعات تخصیص جایزه.');
            }

            
            
            $this->changeToken(
                $keyNo,
                -($reward->Token),
                4,
                "دریافت جایزه: " . $reward->Title,
                ['RewardID' => $reward->ID, 'UsedID' => $availableSlot->ID]
            );

            
            $transaction->commit();

            return [
                'success' => true,
                'message' => 'جایزه با موفقیت به شما اختصاص یافت.',
                'res' => [
                    'used_id' => $availableSlot->ID,
                    'code' => $reward->Code,
                    'title' => $reward->Title,
                    'token_spent' => $reward->Token,
                ]
            ];

        } catch (\Exception $e) {
            
            $transaction->rollBack();
            return [
                'success' => false,
                'type' => "serverError",
                'message' => 'خطای سیستمی: ' . $e->getMessage()
            ];
        }
    }




    
    public function actionTokenHistory() 
    {
        $data = Yii::$app->request->getRawBody();
        if (!empty($data)) {
            $data = json_decode($data, true);
        }

        $keyNo = $data['keyNo'] ?? null;
        $mobNo = $this->userMobNo;

        
        
        $filter = $data['filter'] ?? 'all';

        
        $sort = $data['sort'] ?? 'newest';

        
        if (empty($keyNo) || empty($mobNo)) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'شماره اشتراک و شماره موبایل الزامی است.'
            ];
        }

        $ownershipCheck = $this->checkKeyNoOwnership($keyNo);
        if (is_array($ownershipCheck) && isset($ownershipCheck['success']) && $ownershipCheck['success'] === false) {
            return $ownershipCheck;
        }

        if (!\app\components\Helper::isMobNoValid($mobNo)) {
            return [
                'success' => false,
                'type' => "invalidMobNo",
                'message' => 'شماره موبایل نامعتبر است.'
            ];
        }

        
        $query = OptimizeToken::find()->where(['KeyNo' => $keyNo]);

        
        if ($filter === 'in') {
            $query->andWhere(['>', 'Amount', 0]);
        } elseif ($filter === 'out') {
            $query->andWhere(['<', 'Amount', 0]);
        }

        
        switch ($sort) {
            case 'oldest':
                $query->orderBy(['DateTime' => SORT_ASC]);
                break;
            case 'highest':
                $query->orderBy(['Amount' => SORT_DESC]);
                break;
            case 'lowest':
                $query->orderBy(['Amount' => SORT_ASC]);
                break;
            case 'newest':
            default:
                $query->orderBy(['DateTime' => SORT_DESC]);
                break;
        }

        
        $tokens = $query->all();

        if (empty($tokens)) {
            return [
                'success' => true,
                'count' => 0,
                'res' => [],
                'message' => 'تراکنشی یافت نشد.'
            ];
        }

        
        $res = [];
        foreach ($tokens as $token) {
            $res[] = [
                'id' => $token->ID,
                'amount' => $token->Amount,
                'type' => Yii::$app->params['optimizeTokenType'][$token->Type], 
                'is_positive' => ($token->Amount > 0), 
                'description' => $token->Description,
                'datetime' => Yii::$app->formatter->asDate($token->DateTime, 'php:Y/m/d H:i'), 

            ];
        }

        return [
            'success' => true,
            'count' => count($res),
            'res' => $res
        ];
    }


    
    public function actionSendOtp() 
    {
        $data = Yii::$app->request->getRawBody();
        if (!empty($data)) {
            $data = json_decode($data, true);
        }

        if (empty($data)) {
            return [
                'success' => false,
                'message' => 'خطا در اطلاعات ورودی'
            ];
        }


        $mobNo = $data['mobNo'] ?? null;
        if (empty($mobNo)) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'شماره موبایل وارد نشده است'
            ];
        }

        if (Helper::isMobNoValid($mobNo) == false) {
            return [
                'success' => false,
                'type' => "invalidMobNo",
                'message' => 'شماره نامعتبر'
            ];
        }

        $user = Lognew2::find()->where(['UserType' => "appws", 'JobType' => "androidsms", 'Parameter' => $mobNo])->andWhere("UnixTime >=" . time() - 86400)->count();
        if ($user > 10 && $mobNo != "09120550014") {
            return [
                'success' => false,
                'type' => "overlimitTest",
                'message' => 'درخواست بیش از حد برای شماره موبایل'
            ];
        }

        $allCount = Lognew2::find()->where(['UserType' => "appws", 'JobType' => "androidsms"])->andWhere("UnixTime >=" . time() - 86400)->count();
        if ($allCount > Yii::$app->params['MaxSendWSOTPInDay']) {
            return [
                'success' => false,
                'type' => "overlimitTest2",
                'message' => 'درخواست بیش از حد کلی'
            ];
        }

        Helper::SaveLog("androidsms", $mobNo, 0, Helper::CheckWebserviceType(Yii::$app->params['AppUsername']), 113);

        $tmpRandom = rand(11111, 99999);
        $genRandCount = 0;
        while (OTP::find()->where(['Code' => $tmpRandom])->count() > 0) {
            $tmpRandom = rand(11111, 99999);
            $genRandCount++;
            if ($genRandCount > 5) {
                OTP::deleteAll("CreateDateTime < " . time() - 500);
            }
        }


        $tmpText = "شرکت گاز استان " . Yii::$app->params['CityFa'] . PHP_EOL;
        $tmpText .= "کد تاییدیه شما: " . PHP_EOL . $tmpRandom;

        $OTP = new OTP();
        $OTP->setScenario("create");
        $OTP->ServiceType = "android";
        $OTP->MobNo = $mobNo;
        $OTP->UserType = "Moshtarak";
        $OTP->CreateDateTime = time();
        $OTP->DaftarID = 0;
        $OTP->Code = $tmpRandom;
        $OTP->Data = $mobNo;
        $OTP->Status = 0;
        $OTP->IP = Helper::getIP();
        if (!$OTP->save()) {
            $err = $OTP->getErrorSummary(true);
            return [
                'success' => false,
                'type' => $err,
                'message' => 'خطای تولید توکن'
            ];
        }


        $tmpRest = SMSHelper::sendOnlineSMS($data['mobNo'], $tmpText);

        if (!empty($tmpRest)) {
            return [
                'success' => true,
            ];
        }

        return [
            'success' => false,
            'message' => 'عدم امکان ارسال پیامک'
        ];

    }


    public function actionCheckOtp() 
    {
        $data = Yii::$app->request->getRawBody();
        if (!empty($data)) {
            $data = json_decode($data, true);
        }


        if (empty($data)) {
            return [
                'success' => false,
                'message' => 'خطا در اطلاعات ورودی'
            ];
        }


        $mobNo = $data['mobNo'] ?? null;
        $refer = $data['refer'] ?? null;
        $otp = $data['otp'] ?? null;


        if (empty($mobNo)) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'شماره موبایل وارد نشده است'
            ];
        }


        if (empty($otp)) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'OTP وارد نشده است'
            ];
        }

        if (Helper::isMobNoValid($mobNo) == false) {
            return [
                'success' => false,
                'type' => "invalidMobNo",
                'message' => 'شماره نامعتبر'
            ];
        }


        Helper::SaveLog("checkOTP", "$otp-$mobNo", 0, Helper::CheckWebserviceType(Yii::$app->params['AppUsername']), 113);

        $user = Lognew2::find()->where(['UserType' => "appws", 'JobType' => "checkOTP"])->andWhere("Parameter  like '%-$mobNo' and UnixTime >=" . time() - 360)->count();
        if ($user > 20) {
            return [
                'success' => false,
                'type' => "notExist",
                'message' => 'OTP تلاش زیاد برای'
            ];
        }


        $tmp = OTP::find()->where(['code' => $otp, 'MobNo' => $mobNo, "ServiceType" => "android", "IP" => Helper::getIP()])->orderBy("CreateDateTime Desc")->andWhere("Status<2")->one();
        if (!$tmp) {
            return [
                'success' => false,
                'type' => "notExist",
                'message' => 'OTP نامعتبر'
            ];
        }

        $tmpDiff = time() - $tmp->CreateDateTime;
        if (false &&  ($tmpDiff < 0 || $tmpDiff > 300)) {
            return [
                'success' => false,
                'type' => "expired",
                'message' => 'OTP منقضی شده'
            ];
        }
        $tmp->Status++;
        $tmp->save();

        $now = new \DateTimeImmutable(); 
        $token = Yii::$app->jwt->getConfiguration()->builder()
            ->issuedBy('http://myurl')
            ->permittedFor('http://myurl')
            ->identifiedBy('Mohsen')
            ->issuedAt($now)
            ->canOnlyBeUsedAfter($now)
            ->expiresAt($now->modify('+90 days'))
            ->withClaim('username', Yii::$app->params['AppUsername'])
            ->withClaim('mobno', $mobNo)
            ->getToken(
                Yii::$app->jwt->getConfiguration()->signer(),
                Yii::$app->jwt->getConfiguration()->signingKey()
            );

        if (!empty($refer)) {
            $referrer = OptimizeKeyNo::find()->where(['RefCode' => $refer])->one();

            
            
            if ($referrer && $referrer->MobNo == $mobNo) {
                $referrer = null;
            }

            
            if ($referrer) {
                $alreadyRewarded = \app\models\OptimizeToken::find()
                    ->where(['Type' => 5])
                    ->andWhere(['like', 'Data', $mobNo])
                    ->exists();

                if (!$alreadyRewarded) {
                    
                    $this->changeToken(
                        $referrer->KeyNo,
                        50,
                        5,
                        'پاداش دعوت از دوست با موبایل ' . $mobNo,
                        ['referred_mobNo' => $mobNo]
                    );
                }
            }
        }


        return [
            'success' => true,
            'token' => $token->toString()
        ];

    }


    public function actionLukyWheel() 
    {

        $data = Yii::$app->request->getRawBody();
        if (!empty($data)) {
            $data = json_decode($data, true);
        }
        $keyNo = $data['keyNo'] ?? null;

        if (empty($keyNo) && is_int($keyNo) == false) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'شماره اشتراک وارد شده صحیح نیست'
            ];
        }


        $ownershipCheck = $this->checkKeyNoOwnership($keyNo);
        if (is_array($ownershipCheck) && isset($ownershipCheck['success']) && $ownershipCheck['success'] === false) {
            return $ownershipCheck;
        }


        
        $todayStart = Helper::jalaliToUnix(Yii::$app->formatter->asDate('now', 'php:Y-m-d'));
        $todayEnd = $todayStart + 86400;

        
        $alreadyPlayed = OptimizeToken::find()
            ->where(['KeyNo' => $keyNo, 'Type' => 3])
            ->andWhere(['between', 'DateTime', $todayStart, $todayEnd])
            ->exists();

        if ($alreadyPlayed) {
            return [
                'success' => false,
                'type' => "alreadyPlayed",
                'message' => 'شما امروز شانس خود را امتحان کرده‌اید. فردا دوباره تلاش کنید!'
            ];
        }

        
        $prizes = [
            10 => 110, 20 => 120, 50 => 125, 
            100 => 1, 200 => 1, 300 => 1, 400 => 1, 500 => 1 
        ];

        
        $weightedList = [];
        foreach ($prizes as $amount => $weight) {
            for ($i = 0; $i < $weight; $i++) {
                $weightedList[] = $amount;
            }
        }

        
        $winAmount = $weightedList[array_rand($weightedList)];

        
        try {
            $this->changeToken(
                $keyNo,
                $winAmount,
                3,
                "جایزه گردونه شانس تاریخ " . Yii::$app->formatter->asDate('now', 'php:Y-m-d'),
                ['lucky_wheel' => true]
            );

            return [
                'success' => true,
                'amount' => $winAmount,
                'message' => "تبریک! شما برنده $winAmount امتیاز شدید."
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'خطا در ثبت جایزه: ' . $e->getMessage()
            ];
        }
    }

    private function changeToken($keyNo, $amount, $type, $desc="",$data=[])
    {

        

        $Token = new OptimizeToken();
        $Token->KeyNo = $keyNo;
        $Token->DateTime =Helper::getNowUnixtime();
        $Token->Type = $type;
        $Token->Amount = $amount;
        $Token->Description = $desc;
        $Token->Data = $data;
        $Token->save();
        $this->calcToken($keyNo);
    }

    private function calcToken(int $keyNo)
    {
        $sum=0;
        $model = OptimizeKeyNo::find()->where(["KeyNo" => $keyNo])->one();
        if ($model) {
            foreach ($model->optimizeTokens as $token) {
                $sum+=$token->Amount;
            }
        }
        $model->Token = $sum;
        $model->update();
        return $sum;
    }


    public function actionSearch() 
    {
        $rawData = Yii::$app->request->getRawBody();
        if (!empty($rawData)) {
            $rawData = json_decode($rawData, true);
        }

        $data = $rawData['data'] ?? "";
        $cityID = $rawData['cityid'] ?? "";
        $type = $rawData['type'] ?? "";
        $mobNo = $this->userMobNo;

        if (empty($data)) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'خطا در اطلاعات ورودی'
            ];
        }
        if (empty($type)) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'خطا در اطلاعات ورودی'
            ];
        }


        if ($type == 1) $type = "keyno";
        if ($type == 2) $type = "shgabz";
        if ($type == 3) $type = "serial";
        if ($type == 4) $type = "post";
        
        if (empty($type) || is_numeric($data) == false) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'خطا در اطلاعات ورودی'
            ];
        }


        if (($type == "keyno") && (strlen($data) > 12 || strlen($data) < 9)) {
            $tmparray['res'] = "KeyNoError";
            $tmparray['msg'] = Yii::$app->params['PWAErrorMessage'][$tmparray['res']];
            return $tmparray;
        }
        if (($type == "shgabz") && (strlen($data) > 13 || strlen($data) < 6)) {
            $tmparray['res'] = "DataError";
            $tmparray['msg'] = Yii::$app->params['PWAErrorMessage'][$tmparray['res']];
            return $tmparray;
        }
        if ($type == "serial") {
            if (strlen($data) > 20 || strlen($data) < 5 || $data == "00000" || $cityID == 0 || $cityID == "" || $cityID > 1000) {
                return [
                    'success' => false,
                    'type' => "overlimitTest",
                    'message' => 'درخواست بیش از حد '
                ];
            }
        }
        if ($type == "post") {
            if (strlen($data) != 10 || $data == "0000000000") {
                return [
                    'success' => false,
                    'type' => "dataError",
                    'message' => 'خطا در اطلاعات ورودی'
                ];
            }
        }



        Helper::SaveLog("search", "$data-$type-$cityID-$mobNo", Yii::$app->user->identity->ID, Helper::CheckWebserviceType(Yii::$app->params['AppUsername']), 113);
        $tmpco = Lognew2::find()->where(['UserType' => "appws", 'JobType' => "search","UserID"=>Yii::$app->user->identity->ID])->andWhere("Parameter  like '%-$mobNo' and UnixTime >=" . time() - 86400)->count();

            if ($tmpco > 11) {
                return [
                    'success' => false,
                    'type' => "overlimitTest",
                    'message' => 'درخواست بیش از حد '
                ];
            }



        $models = Data::find()->select("NewKeyNo")->limit(5);
        if ($type == "keyno") {
            $data = ltrim($data, "0");
            $models = $models->where(["NewKeyNo" => $data])->all();
        } elseif ($type == "shgabz") {
            $data = ltrim($data, "0");
            $models = $models->where(["ShGabz" => $data])->all();
        } elseif ($type == "post") {
            $models = $models->where(["CodePosti" => $data])->all();
        } elseif ($type == "serial") {
            $models = $models->where(['like', 'Serial', $data])->andWhere(["Shahr" => $cityID])->all();
        } else {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'خطا در اطلاعات ورودی'
            ];
        }


        $count = 0;
        $Data = [];
        $tmpMyKeyNo = [];
        foreach ($models as $tmpKeyNo) {
            $tmpMyKeyNo[] = $tmpKeyNo->NewKeyNo;
        }
        $KeyNoList = Data::find()->cache(300)->select("tblData.MobNo,tblData.Name,tblData.Family,Address,Serial,NewKeyNo,tblCity.Name as NameAndFamily")->join("left join", "tblCity", "tblCity.CityID=Shahr")->where(['NewKeyNo' => $tmpMyKeyNo])->all();
        foreach ($KeyNoList as $tmp) {
            $Data[$count]['Name'] = $tmp->Name . " " . $tmp->Family;
            $Data[$count]['Address'] = $tmp->Address;
            $Data[$count]['City'] = $tmp->NameAndFamily;
            $Data[$count]['Serial'] = $tmp->Serial;
            $Data[$count]['KeyNo'] = $tmp->NewKeyNo;
            $Data[$count]['Primary'] = false;
            $count++;
        }
        if ($count == 0) {
            return [
                'success' => false,
                'type' => "notFound",
                'message' => 'اطلاعاتی پیدا نشد'
            ];
        }

        return [
            'success' => true,
            'count' => $count,
            'res' => $Data
        ];


    }
    public function actionUpdateFirebase() 
    {

        $data = Yii::$app->request->getRawBody();
        if (!empty($data)) {
            $data = json_decode($data, true);
        }

        if (empty($data)) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'خطا در اطلاعات ورودی'
            ];
        }


        $keyNo = $data['keyNo'] ?? null;
        $oldGoogleID = $data['oldGoogleID'] ?? null;
        $newGoogleID = $data['newGoogleID'] ?? null;
        $mobNo = $this->userMobNo;
        $platform = "Google";
        if (empty($keyNo) && is_int($keyNo) == false) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'شماره اشتراک وارد شده صحیح نیست'
            ];
        }


        if (empty($mobNo)) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'شماره موبایل وارد نشده است'
            ];
        }

        if (Helper::isMobNoValid($mobNo) == false) {
            return [
                'success' => false,
                'type' => "invalidMobNo",
                'message' => 'شماره نامعتبر'
            ];
        }

        $keyNoData = Data::find()->where(['NewKeyNo' => $keyNo])->one();
        if (!$keyNoData) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'شماره اشتراک وارد شده صحیح نیست'
            ];
        }



        $ownershipCheck = $this->checkKeyNoOwnership($keyNo);
        if (is_array($ownershipCheck) && isset($ownershipCheck['success']) && $ownershipCheck['success'] === false) {
            return $ownershipCheck;
        }


        $type = "";

        if (!empty($oldGoogleID) && !empty($newGoogleID)) {
            $type = 'update';
        } else if (empty($oldGoogleID) && !empty($newGoogleID)) {
            $type = 'add'; 
        } else if (!empty($oldGoogleID) && empty($newGoogleID)) {
            $type = 'delete'; 
        }

        if ($type == "delete") {
            AppNotification::deleteAll(
                [
                    'and',
                    ['KeyNo' => $keyNo, 'MobNo' => $mobNo, 'Platform' => $platform], 
                    'CONVERT(VARCHAR, Data) = :newId'                                
                ],
                [
                    ':newId' => $oldGoogleID 
                ]
            );
            OptimizeKeyNo::updateAll(["GoogleID" => ""], ["KeyNo" => $keyNo]);
        } elseif ($type == "add") {

            $exists = AppNotification::find()->where(['KeyNo' => $keyNo, "MobNo" => $mobNo, "Platform" => $platform])->andWhere("CONVERT(VARCHAR, Data) = '$newGoogleID'")->exists();
            if (!$exists) {
                $AppNotification = new AppNotification();
                $AppNotification->KeyNo = $keyNo;
                $AppNotification->MobNo = $mobNo;
                $AppNotification->Platform = $platform;
                $AppNotification->Data = $newGoogleID;
                $AppNotification->Counter = 0;
                $AppNotification->CreateTime = time();
                $AppNotification->save();
                OptimizeKeyNo::updateAll(["GoogleID" => $newGoogleID], ["KeyNo" => $keyNo]);
            }
        } elseif ($type == "update") {

            $notification = AppNotification::find()
                ->where(['KeyNo' => $keyNo, "MobNo" => $mobNo, "Platform" => $platform])
                ->andWhere('CONVERT(VARCHAR, Data) = :oldId', [':oldId' => $oldGoogleID])
                ->one();
            if ($notification !== null) { 
                $notification->Data = $newGoogleID;
                $notification->save();
            }
            OptimizeKeyNo::updateAll(["GoogleID" => $newGoogleID], ["KeyNo" => $keyNo]);
        } else {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'وضعیت آپدیت مشخص نیست'
            ];
        }


        return [
            'success' => true,
            'type' => $type
        ];


    }


    
    public function actionGetFaq() 
    {
        
        
        $rawData = Yii::$app->request->getRawBody();
        if (!empty($rawData)) {
            $rawData = json_decode($rawData, true);
        }

        $faqs = \app\models\OptimizeFAQ::find()->cache(7200)
            ->orderBy(['Order' => SORT_ASC])
            ->asArray() 
            ->all();

        if (empty($faqs)) {
            return [
                'success' => false,
                'type' => "notFound",
                'message' => 'سوالی یافت نشد.'
            ];
        }

        
        return [
            'success' => true,
            'count' => count($faqs),
            'res' => $faqs
        ];
    }

    public function actionHint() 
    {
        $data = Yii::$app->request->getRawBody();
        if (!empty($data)) {
            $data = json_decode($data, true);
        }

        $type = $data['type'] ?? null;
        $keyNo = $data['keyNo'] ?? null; 

        if (empty($data)) {
            return [
                'success' => false,
                'message' => 'خطا در اطلاعات ورودی'
            ];
        }

        if (empty($keyNo)) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'شماره اشتراک (keyNo) الزامی است'
            ];
        }
        if (empty($type) && is_int($type) == false) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'نوع وارد نشده است'
            ];
        }
        
        $type = $data['type'] ?? null;




        $ownershipCheck = $this->checkKeyNoOwnership($keyNo);
        if (is_array($ownershipCheck) && isset($ownershipCheck['success']) && $ownershipCheck['success'] === false) {
            return $ownershipCheck;
        }

        $results = [];

        
        if ($type == 2 || $type == 3) {
            $hint = OptimizeHint::find()
                ->where(['Type' => $type])
                ->orderBy(new \yii\db\Expression('NEWID()')) 
                ->one();

            if (empty($hint)) {
                return [
                    'success' => false,
                    'type' => "notFound",
                    'message' => 'موردی برای این نوع یافت نشد'
                ];
            }

                $results[] = [
                    'id' => $hint->ID,
                    'message' => $hint->Message,
                    'token' => $hint->Token,
                ];

        }

        elseif ($type == 1) {
            
            $unseenHints = OptimizeHint::find()
                ->where(['Type' => 1])
                ->andWhere(['not in', 'ID', (new \yii\db\Query())->select('HintID')->from('tblOptimizeHintSeen')->where(['KeyNo' => $keyNo])])
                ->orderBy(new \yii\db\Expression('NEWID()'))
                ->limit(5)
                ->all();

            foreach ($unseenHints as $h) {
                $results[] = [
                    'id' => $h->ID,
                    'message' => $h->Message,
                    'token' => $h->Token,
                    'is_done' => false 
                ];
            }

            
            $missingCount = 5 - count($results);

            
            if ($missingCount > 0) {
                $seenHints = OptimizeHint::find()
                    ->where(['Type' => 1])
                    ->andWhere(['in', 'ID', (new \yii\db\Query())->select('HintID')->from('tblOptimizeHintSeen')->where(['KeyNo' => $keyNo])])
                    ->orderBy(new \yii\db\Expression('NEWID()'))
                    ->limit($missingCount)
                    ->all();

                foreach ($seenHints as $h) {
                    $results[] = [
                        'id' => $h->ID,
                        'message' => $h->Message,
                        'token' => $h->Token,
                        'is_done' => true 
                    ];
                }
            }
        }

        
        if (empty($results)) {
            return [
                'success' => false,
                'type' => "notFound",
                'message' => 'موردی برای این نوع یافت نشد'
            ];
        }

        
        return [
            'success' => true,
            'count' => count($results),
            'res' => $results
        ];

    }

    
    public function actionSubmitHint() 
    {
        $data = Yii::$app->request->getRawBody();
        if (!empty($data)) {
            $data = json_decode($data, true);
        }

        $keyNo = $data['keyNo'] ?? null;
        $hintId = $data['hintId'] ?? null;

        if (empty($keyNo) || empty($hintId)) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'شماره اشتراک و شناسه راهنما (hintId) الزامی است'
            ];
        }

        
        $hint = OptimizeHint::findOne($hintId);
        if (!$hint) {
            return [
                'success' => false,
                'type' => "notFound",
                'message' => 'راهنما یا ماموریت مورد نظر یافت نشد'
            ];
        }


        $ownershipCheck = $this->checkKeyNoOwnership($keyNo);
        if (is_array($ownershipCheck) && isset($ownershipCheck['success']) && $ownershipCheck['success'] === false) {
            return $ownershipCheck;
        }


        
        $alreadyDone = OptimizeHintSeen::find()
            ->where(['KeyNo' => $keyNo, 'HintID' => $hintId])
            ->exists();

        if ($alreadyDone) {
            return [
                'success' => false,
                'type' => "duplicate",
                'message' => 'شما قبلا این مورد را انجام داده‌اید'
            ];
        }

        
        $transaction = Yii::$app->db->beginTransaction();

        try {
            
            $seen = new OptimizeHintSeen();
            $seen->KeyNo = $keyNo;
            $seen->HintID = $hintId;
            $seen->DateTime = \app\components\Helper::getNowUnixtime();

            if (!$seen->save()) {
                throw new \Exception('خطا در ثبت بازدید');
            }

            
            if ($hint->Type == 1 && $hint->Token > 0) {
                
                
                $this->changeToken($keyNo, $hint->Token, 2, "پاداش ماموریت روزانه" . $hint->ID,["HintID"=>$hint->ID]);
            }

            $transaction->commit();

            return [
                'success' => true,
                'message' => 'ماموریت با موفقیت ثبت شد',
                'earned_token' => ($hint->Type == 1) ? $hint->Token : 0
            ];

        } catch (\Exception $e) {
            $transaction->rollBack();
            return [
                'success' => false,
                'type' => "serverError",
                'message' => 'خطای سیستمی در ثبت اطلاعات: ' . $e->getMessage()
            ];
        }
    }



    public function actionReward() 
    {
        $data = json_decode(Yii::$app->request->getRawBody(), true);
        $keyNo = $data['keyNo'] ?? null;
        $now = time();


        if (empty($keyNo) && is_int($keyNo) == false) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'شماره اشتراک وارد شده صحیح نیست'
            ];
        }

        $ownershipCheck = $this->checkKeyNoOwnership($keyNo);
        if (is_array($ownershipCheck) && isset($ownershipCheck['success']) && $ownershipCheck['success'] === false) {
            return $ownershipCheck;
        }

        
        $rewards = OptimizeReward::find()
            ->with(['availableItems'])
            ->where(['and',
                ['or', ['<=', 'StartDate', $now], ['is', 'StartDate', null]],
                ['or', ['>=', 'EndDate', $now], ['is', 'EndDate', null]]
            ])
            ->all();

        $res = [];
        foreach ($rewards as $reward) {
            $availableCount = count($reward->availableItems);

            
            $isRedeemed = false;
            if ($keyNo) {
                $isRedeemed = OptimizeRewardUsed::find()
                    ->where(['RewardID' => $reward->ID, 'KeyNo' => $keyNo])
                    ->exists();
            }

            
            
            $isReusable = ($reward->Type == 0);

            
            
            $isLocked = ($isRedeemed && !$isReusable);

            if ($availableCount > 0 || $isRedeemed) {
                $res[] = [
                    'id' => $reward->ID,
                    'title' => $reward->Title,
                    'text' => $reward->Text,
                    'image' => $reward->Image,
                    'token_required' => $reward->Token,
                    'stock' => (int)$availableCount,
                    'category' => $reward->Category,
                    'is_redeemed' => $isRedeemed,   
                    'is_reusable' => $isReusable,   
                    'is_locked' => $isLocked,       
                ];
            }
        }

        return [
            'success' => true,
            'count' => count($res),
            'res' => $res
        ];
    }


    
    public function actionMyRewards() 
    {
        $data = json_decode(Yii::$app->request->getRawBody(), true);
        $keyNo = $data['keyNo'] ?? null;


        $ownershipCheck = $this->checkKeyNoOwnership($keyNo);
        if (is_array($ownershipCheck) && isset($ownershipCheck['success']) && $ownershipCheck['success'] === false) {
            return $ownershipCheck;
        }

        if (empty($keyNo) || !is_numeric($keyNo)) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'شماره اشتراک معتبر وارد نشده است.'
            ];
        }

        
        

        
        $myRewards = \app\models\OptimizeRewardUsed::find()
            ->with('reward')
            ->where(['KeyNo' => $keyNo])
            ->orderBy(['DateTime' => SORT_DESC])
            ->all();

        if (empty($myRewards)) {
            return [
                'success' => false,
                'type' => "notFound",
                'message' => 'شما تاکنون جایزه‌ای دریافت نکرده‌اید.'
            ];
        }

        $res = [];
        foreach ($myRewards as $used) {
            $reward = $used->reward;

            
            if (!$reward) continue;

            
            $extraData = $used->Data;
            if (is_string($extraData)) {
                $decoded = json_decode($extraData, true);
                $extraData = (json_last_error() === JSON_ERROR_NONE) ? $decoded : $extraData;
            }

            $res[] = [
                'used_id' => $used->ID,
                'reward_id' => $reward->ID,
                'title' => $reward->Title,
                'text' => $reward->Text,
                'image' => $reward->Image,
                'category' => $reward->Category,
                'token_spent' => $reward->Token,
                'assignee_date' => Helper::unixtimeToJalali($used->AssigneeDate), 
                'code' => $extraData 
            ];
        }

        return [
            'success' => true,
            'count' => count($res),
            'res' => $res
        ];
    }



    public function actionSubmitKeyno() 
    {


        $data = Yii::$app->request->getRawBody();
        if (!empty($data)) {
            $data = json_decode($data, true);
        }

        if (empty($data)) {
            return [
                'success' => false,
                'message' => 'خطا در اطلاعات ورودی'
            ];
        }

        $keyNo = $data['keyNo'] ?? null;
        $googleID = $data['googleID'] ?? null;
        $mobNo = $this->userMobNo;
        $alias = $data['alias'] ?? "";

        if (empty($keyNo) && is_int($keyNo) == false) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'شماره اشتراک وارد شده صحیح نیست'
            ];
        }


        if (empty($mobNo)) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'شماره موبایل وارد نشده است'
            ];
        }

        if (Helper::isMobNoValid($mobNo) == false) {
            return [
                'success' => false,
                'type' => "invalidMobNo",
                'message' => 'شماره نامعتبر'
            ];
        }

        $keyNoData = Data::find()->where(['NewKeyNo' => $keyNo])->one();
        if (!$keyNoData) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'شماره اشتراک وارد شده صحیح نیست'
            ];
        }

        $dupKeyNo = OptimizeKeyNo::find()->where(['KeyNo' => $keyNo])->one();
        if ($dupKeyNo) {
            return [
                'success' => false,
                'type' => "dupli",
                'message' => 'این اشتراک قبلا با موبایل ' . Helper::MobNoMask($dupKeyNo->MobNo) . ' ثبت شده است'
            ];
        }


        $tmpLog = Lognew2::find()->where(['UserType' => "appws", 'JobType' => "submitKeyNo","UserID"=>Yii::$app->user->identity->ID])->andWhere("Parameter  like '$mobNo' and UnixTime >=" . time() - 86400)->count();
        if ($tmpLog > 5) {
            return [
                'success' => false,
                'type' => "tooMuch",
                'message' => 'محدودیت در ثبت اشتراک در روز'
            ];
        }


        $tmpRef=rand(10000, 999999);

        $tmpExist = OptimizeKeyNo::find()->where(['MobNo' => $mobNo])->one();
        if($tmpExist){
            $tmpRef = $tmpExist->RefCode;
        }

        
        $tmpKeyNo = new OptimizeKeyNo();
        $tmpKeyNo->KeyNo = $keyNo;
        $tmpKeyNo->StartDate = Helper::getNowUnixtime();
        $tmpKeyNo->CityID = $keyNoData->Shahr;
        $tmpKeyNo->GoogleID = (string)$googleID;
        $tmpKeyNo->Token = 0;
        $tmpKeyNo->Alias = $alias;
        $tmpKeyNo->RefCode = (string)$tmpRef;
        $tmpKeyNo->MobNo = $mobNo;
        if ($tmpKeyNo->save()) {


            Helper::SaveLog("submitKeyNo", "$mobNo", Yii::$app->user->identity->ID, Helper::CheckWebserviceType(Yii::$app->params['AppUsername']), 113);

            return [
                'success' => true,
                'refCode' => $tmpKeyNo->RefCode,
            ];
        } else {
            return [
                'success' => false,
                'type' => "saveError",
                'message' => $tmpKeyNo->getErrorSummary(true)
            ];
        }


    }

    public function actionSubmitKarkard() 
    {

        $data = Yii::$app->request->getRawBody();
        if (!empty($data)) {
            $data = json_decode($data, true);
        }

        if (empty($data)) {
            return [
                'success' => false,
                'message' => 'خطا در اطلاعات ورودی'
            ];
        }


        $keyNo = $data['keyNo'] ?? null;
        $counterNumber = $data['counterNumber'] ?? null;
        $imageFile = $data['imageFile'] ?? null;


        if (empty($keyNo) && is_int($keyNo) == false) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'شماره اشتراک وارد شده صحیح نیست'
            ];
        }
        if (empty($counterNumber) || is_int($counterNumber) == false) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'زقم کنتور وارد شده صحیح نیست'
            ];
        }
        if (empty($imageFile)) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'تصویر کنتور وارد نشده است'
            ];
        }


        $ownershipCheck = $this->checkKeyNoOwnership($keyNo);
        if (is_array($ownershipCheck) && isset($ownershipCheck['success']) && $ownershipCheck['success'] === false) {
            return $ownershipCheck;
        }


        $tmpFrom = Helper::jalaliToUnix(Yii::$app->formatter->asDate('now', 'php:Y-m-d'));
        $tmpTo = Helper::jalaliToUnix(Yii::$app->formatter->asDate('now', 'php:Y-m-d')) + 86400;


        $co = OptimizeKarkard::find()->where(['KeyNo' => $keyNo, "Type" => 1])->andWhere("[DateTime] between $tmpFrom and $tmpTo")->count();
        if ($co > 0) {
            return [
                'success' => false,
                'type' => "dupli",
                'message' => 'برای امروز رقم ثبت شده است'
            ];
        }


        $karKard = new OptimizeKarkard();
        $karKard->KeyNo = $keyNo;
        $karKard->DateTime = Helper::getNowUnixtime();
        $karKard->CounterNumber = $counterNumber;
        $karKard->Type = 1;
        $karKard->ImageFile = $imageFile;
        $karKard->Data = json_encode([]);
        $karKard->AINumber = 0;
        $karKard->save();


        if ($karKard->save()) {
            $this->changeToken($keyNo,50,1,'پاداش اعلام کارکرد تاریخ '. Yii::$app->formatter->asDate('now', 'php:Y-m-d'));
            return [
                'success' => true,
            ];
        } else {
            return [
                'success' => false,
                'type' => "saveError",
                'message' => $karKard->getErrorSummary(true)
            ];
        }

    }



    public function actionKeynoList() 
    {
        
        $mobNo = $this->userMobNo;

        
        
        if (empty($mobNo) || \app\components\Helper::isMobNoValid($mobNo) == false) {
            return [
                'success' => false,
                'type' => "invalidMobNo",
                'message' => 'شماره موبایل نامعتبر است یا یافت نشد.'
            ];
        }

        \app\components\Helper::SaveLog("keynolist", $mobNo, 0, "appws", 113);

        
        
        $query = (new \yii\db\Query())
            ->select([
                'tblData.Name',
                'tblData.Family',
                'tblData.Address',
                'tblData.Serial',
                'tblData.NewKeyNo as KeyNo',
                'tblData.MobNo as DataMobNo', 
                'tblCity.Name as CityName',
                'tblOptimizeKeyNo.Alias'
            ])
            ->from('tblOptimizeKeyNo')
            ->leftJoin('tblData', 'tblData.NewKeyNo = tblOptimizeKeyNo.KeyNo')
            ->leftJoin('tblCity', 'tblCity.CityID = tblData.Shahr')
            ->where(['tblOptimizeKeyNo.MobNo' => $mobNo])
            ->all();

        if (empty($query)) {
            return [
                'success' => false,
                'type' => "notFound",
                'message' => 'اشتراکی برای شما یافت نشد.'
            ];
        }

        
        $keyNos = array_column($query, 'KeyNo');

        
        
        $notifications = AppNotification::find()
            ->select(['KeyNo', 'Data'])
            ->where(['KeyNo' => $keyNos, 'Platform' => 'Google', 'MobNo' => $mobNo])
            ->asArray()
            ->all();

        
        $googleIdMap = [];
        foreach ($notifications as $notif) {
            $googleIdMap[$notif['KeyNo']][] = $notif['Data'];
        }

        
        $res = [];
        foreach ($query as $row) {
            $res[] = [
                'Name' => trim($row['Name'] . ' ' . $row['Family']),
                'Address' => $row['Address'],
                'City' => $row['CityName'],
                'Serial' => $row['Serial'],
                'KeyNo' => $row['KeyNo'],
                'Alias' => $row['Alias'],
                
                'Primary' => ($mobNo === $row['DataMobNo']),
                'HasGoogleID' => $googleIdMap[$row['KeyNo']] ?? []
            ];
        }

        return [
            'success' => true,
            'count' => count($res),
            'res' => $res
        ];
    }




    public function actionChart() 
    {

        $data = Yii::$app->request->getRawBody();
        if (!empty($data)) {
            $data = json_decode($data, true);
        }

        $keyNo = $data['keyNo'] ?? null;

        if (empty($keyNo) && is_int($keyNo) == false) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'شماره اشتراک وارد شده صحیح نیست'
            ];
        }


        $ownershipCheck = $this->checkKeyNoOwnership($keyNo);
        if (is_array($ownershipCheck) && isset($ownershipCheck['success']) && $ownershipCheck['success'] === false) {
            return $ownershipCheck;
        }

        $Data = Gabz::CalcChart($keyNo);
        $count = count($Data);
        if ($count == 0) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'اطلاعاتی ثبت نشده است'
            ];
        }
        return [
            'success' => true,
            'data' => $Data,
            'count' => $count,
        ];

    }


    
    
    public function actionGetProfile() 
    {
        $data = Yii::$app->request->getRawBody();
        if (!empty($data)) {
            $data = json_decode($data, true);
        }

        $mobNo = $this->userMobNo;
        $keyNo = $data['keyNo'] ?? null;

        $referCode="";

        if (empty($mobNo)) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'شماره موبایل الزامی است.'
            ];
        }

        if (empty($keyNo) && is_int($keyNo) == false) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'شماره اشتراک وارد شده صحیح نیست'
            ];
        }

        $ownershipCheck = $this->checkKeyNoOwnership($keyNo);
        if (is_array($ownershipCheck) && isset($ownershipCheck['success']) && $ownershipCheck['success'] === false) {
            return $ownershipCheck;
        }

        
        $query = \app\models\OptimizeKeyNo::find()
            ->where(['MobNo' => $mobNo])
            ->with(['optimizeRewardUseds.reward']); 

        
        $query->andFilterWhere(['KeyNo' => $keyNo]);

        $users = $query->orderBy(['StartDate' => SORT_DESC])->all();

        if (empty($users)) {
            return [
                'success' => false,
                'type' => "notFound",
                'message' => 'اطلاعاتی یافت نشد.'
            ];
        }

        $res = [];
        foreach ($users as $user) {
            
            $myRewards = [];
            foreach ($user->optimizeRewardUseds as $used) {
                if ($used->reward) { 
                    $myRewards[] = [
                        'used_id' => $used->ID,
                        'reward_id' => $used->reward->ID,
                        'title' => $used->reward->Title,
                        'image' => $used->reward->Image,
                        'code' => $used->reward->Code, 
                        'date_unix' => $used->DateTime,
                        'date_jalali' => $used->DateTime ? Yii::$app->formatter->asDate($used->DateTime, 'php:Y/m/d') : null,
                        'extra_data' => $used->Data 
                    ];
                }
            }

            
            $res[] = [
                'key_no' => $user->KeyNo,
                'alias' => $user->Alias,
                'city_name' => \app\components\Helper::getCityName($user->CityID),
                'total_token' => (int) $user->Token,
                
                'has_google_id' => !empty($user->GoogleID),
                'start_date_jalali' => $user->StartDate ? Yii::$app->formatter->asDate($user->StartDate, 'php:Y/m/d') : null,
                'rewards_count' => count($myRewards),
                
            ];
            $referCode=$user->RefCode;
        }

        return [
            'success' => true,
            'mobNo' => $mobNo,
            'referCode' => $referCode,
            'count' => count($res),
            'res' => $res
        ];
    }


    
    
    public function actionLeaderboard() 
    {
        $data = json_decode(Yii::$app->request->getRawBody(), true);
        $keyNo = $data['keyNo'] ?? null;
        $isCity = isset($data['isCity']) ? (bool)$data['isCity'] : false;

        
        if (empty($keyNo) || !is_numeric($keyNo)) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'شماره اشتراک الزامی است.'
            ];
        }

        
        $currentUserRecord = \app\models\OptimizeKeyNo::findOne($keyNo);
        if (!$currentUserRecord) {
            return [
                'success' => false,
                'type' => "notFound",
                'message' => 'شماره اشتراک در سیستم یافت نشد.'
            ];
        }

        $ownershipCheck = $this->checkKeyNoOwnership($keyNo);
        if (is_array($ownershipCheck) && isset($ownershipCheck['success']) && $ownershipCheck['success'] === false) {
            return $ownershipCheck;
        }

        $mobNo = $this->userMobNo;
        $cityId = $currentUserRecord->CityID;
        $cityName = \app\components\Helper::getCityName($cityId);

        
        $condition = [];
        if ($isCity && $cityId) {
            $condition = ['CityID' => $cityId];
        }

        
        $myTotalToken = (int) \app\models\OptimizeKeyNo::find()
            ->where(['MobNo' => $mobNo])
            ->andFilterWhere($condition)
            ->sum('Token');

        
        $statsQuery = (new \yii\db\Query())->from('{{%OptimizeKeyNo}}')->where($condition);
        $totalUsers = (int) $statsQuery->count('DISTINCT MobNo');
        $totalTokensSystem = (int) $statsQuery->sum('Token');

        
        $higherUsersCount = (int) (new \yii\db\Query())
            ->select(['MobNo'])
            ->from('{{%OptimizeKeyNo}}')
            ->where($condition)
            ->groupBy(['MobNo'])
            ->having(['>', 'SUM(Token)', $myTotalToken])
            ->count();

        $myRank = $higherUsersCount + 1;

        
        $topUsers = (new \yii\db\Query())
            ->select(['MobNo', 'SUM(Token) as TotalToken'])
            ->from('{{%OptimizeKeyNo}}')
            ->where($condition)
            ->groupBy(['MobNo'])
            ->orderBy(['TotalToken' => SORT_DESC])
            ->limit(20)
            ->all();

        $leaderboard = [];
        $rankCounter = 1;
        foreach ($topUsers as $user) {
            $isMe = ($user['MobNo'] === $mobNo);
            $leaderboard[] = [
                'rank' => $rankCounter++,
                'mob_no' => $isMe ? $user['MobNo'] : Helper::MobNoMask($user['MobNo']),
                'is_me' => $isMe,
                'token' => (int) $user['TotalToken']
            ];
        }

        return [
            'success' => true,
            'summary' => [
                'my_rank' => $myRank,
                'my_token' => $myTotalToken,
                'total_users' => $totalUsers,
                'total_tokens_all' => $totalTokensSystem,
                'scope' => $isCity ? 'city' : 'province',
                'city_name' => $cityName
            ],
            'top_20' => $leaderboard
        ];
    }

    
    public function actionGetMessages() 
    {
        $data = json_decode(Yii::$app->request->getRawBody(), true);
        $keyNo = $data['keyNo'] ?? null;
        $type = $data['type'] ?? null; 
        $now = time();





        
        $query = \app\models\OptimizeMessage::find()
            ->where(['and',
                ['or', ['>', 'ExpireTime', $now], ['is', 'ExpireTime', null]]
            ]);

        
        $query->andFilterWhere(['Type' => $type]);

        
        if (!empty($keyNo)) {

            $ownershipCheck = $this->checkKeyNoOwnership($keyNo);
            if (is_array($ownershipCheck) && isset($ownershipCheck['success']) && $ownershipCheck['success'] === false) {
                return $ownershipCheck;
            }

            
            $query->andWhere(['KeyNo' => $keyNo]);
        } else {
            
            $query->andWhere(['or', ['is', 'KeyNo', null], ['KeyNo' => 0]]);
        }

        $messages = $query->orderBy(['CreateTime' => SORT_DESC])->all();

        if (empty($messages)) {
            return [
                'success' => true,
                'count' => 0,
                'res' => [],
                'message' => 'پیامی یافت نشد.'
            ];
        }

        
        $res = [];
        foreach ($messages as $msg) {
            $res[] = [
                'id' => $msg->ID,
                'title' => $msg->Title,
                'text' => $msg->Text,
                'category' => $msg->Category,
                'icon' => $msg->Icon,
                'image_url' => $msg->ImageURL,
                'video_url' => $msg->VideoURL,
                'type' => (int)$msg->Type,
                'type_label' => ($msg->Type == 0) ? 'آموزش' : 'پیام', 
                'token_reward' => (int)$msg->Token,
                'duration' => $msg->Duration,
                'is_personal' => ($msg->KeyNo > 0), 
                'date_unix' => $msg->CreateTime,
                'date_jalali' => $msg->CreateTime ? Yii::$app->formatter->asDate($msg->CreateTime, 'php:Y/m/d H:i') : null,
            ];
        }

        return [
            'success' => true,
            'count' => count($res),
            'res' => $res
        ];
    }


    
    public function actionClaimMessageToken() 
    {
        $data = json_decode(Yii::$app->request->getRawBody(), true);
        $keyNo = $data['keyNo'] ?? null;
        $messageId = $data['messageId'] ?? null;

        
        if (empty($keyNo) || empty($messageId)) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'شماره اشتراک یا شناسه پیام ارسال نشده است.'
            ];
        }

        $ownershipCheck = $this->checkKeyNoOwnership($keyNo);
        if (is_array($ownershipCheck) && isset($ownershipCheck['success']) && $ownershipCheck['success'] === false) {
            return $ownershipCheck;
        }

        
        $message = \app\models\OptimizeMessage::findOne($messageId);
        if (!$message) {
            return [
                'success' => false,
                'type' => "notFound",
                'message' => 'پیام مورد نظر یافت نشد.'
            ];
        }

        if ($message->Token <= 0) {
            return [
                'success' => false,
                'type' => "noToken",
                'message' => 'این پیام امتیاز قابل دریافتی ندارد.'
            ];
        }

        
        
        $alreadyClaimed = \app\models\OptimizeToken::find()
            ->where(['KeyNo' => $keyNo, 'Type' => 6])
            ->andWhere(['like', 'Data', '"message_id":' . $messageId])
            ->exists();

        if ($alreadyClaimed) {
            return [
                'success' => false,
                'type' => "alreadyClaimed",
                'message' => 'امتیاز این پیام قبلاً توسط شما دریافت شده است.'
            ];
        }

        
        $transaction = Yii::$app->db->beginTransaction();
        try {
            
            
            $this->changeToken(
                $keyNo,
                $message->Token,
                6,
                "پاداش مشاهده پیام: " . $message->Title,
                ['message_id' => (int)$messageId]
            );

            $transaction->commit();

            return [
                'success' => true,
                'message' => 'امتیاز پیام با موفقیت به حساب شما واریز شد.',
                'added_token' => $message->Token
            ];

        } catch (\Exception $e) {
            $transaction->rollBack();
            return [
                'success' => false,
                'type' => "serverError",
                'message' => 'خطا در ثبت امتیاز: ' . $e->getMessage()
            ];
        }
    }



    
    private function checkKeyNoOwnership($keyNo)
    {
        
        if (empty($keyNo)) {
            return [
                'success' => false,
                'type' => "dataError",
                'message' => 'شماره اشتراک الزامی است.'
            ];
        }

        
        $keyNoRecord = OptimizeKeyNo::find()->where(['KeyNo' => $keyNo])->one();

        if (!$keyNoRecord) {
            return [
                'success' => false,
                'type' => "notFound",
                'message' => 'دسترسی غیرمجاز! این شماره اشتراک متعلق به شما نیست.'
            ];
        }

        
        
        if ($keyNoRecord->MobNo !== $this->userMobNo) {
            return [
                'success' => false,
                'type' => "forbidden",
                'message' => 'دسترسی غیرمجاز! این شماره اشتراک متعلق به شما نیست.'
            ];
        }

        
        return $keyNoRecord;
    }

    public function actionCityList() 
    {
        $tmparray = array();
        $list = [];
        $models = City::find()->cache(7200)->all();
        foreach ($models as $model) {
            $list[$model->CityID] = trim($model->Name);
        }
        return $list;

    }
}
