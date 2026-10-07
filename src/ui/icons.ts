// 앱에서 쓰는 아이콘 - Phosphor 한 가족으로 통일.
//
// 예전엔 이모지 31종(101회)을 UI 아이콘으로 썼는데, OS마다 모양이 완전히 다르고 다크모드
// 색을 맞출 수 없고 스크린리더가 "카메라 이모지"처럼 읽어서 아이콘 라이브러리로 바꿨다.
// (축하 컨페티처럼 "내용"으로서의 이모지는 그대로 둔다.)
//
// 배럴(import { X } from "phosphor-react-native")로 가져오면 3천 개 넘는 아이콘이 통째로
// 번들에 들어가므로, 쓰는 것만 개별 경로로 가져와 여기서 다시 내보낸다.

export { ArrowClockwiseIcon as ArrowClockwise } from "phosphor-react-native/src/icons/ArrowClockwise";
export { ArrowRightIcon as ArrowRight } from "phosphor-react-native/src/icons/ArrowRight";
export { BowlFoodIcon as BowlFood } from "phosphor-react-native/src/icons/BowlFood";
export { CameraIcon as Camera } from "phosphor-react-native/src/icons/Camera";
export { CaretDownIcon as CaretDown } from "phosphor-react-native/src/icons/CaretDown";
export { CaretLeftIcon as CaretLeft } from "phosphor-react-native/src/icons/CaretLeft";
export { CaretRightIcon as CaretRight } from "phosphor-react-native/src/icons/CaretRight";
export { ChatCircleDotsIcon as ChatCircleDots } from "phosphor-react-native/src/icons/ChatCircleDots";
export { CheckIcon as Check } from "phosphor-react-native/src/icons/Check";
export { CheckCircleIcon as CheckCircle } from "phosphor-react-native/src/icons/CheckCircle";
export { ClockIcon as Clock } from "phosphor-react-native/src/icons/Clock";
export { CompassIcon as Compass } from "phosphor-react-native/src/icons/Compass";
export { ConfettiIcon as Confetti } from "phosphor-react-native/src/icons/Confetti";
export { EnvelopeIcon as Envelope } from "phosphor-react-native/src/icons/Envelope";
export { EyeIcon as Eye } from "phosphor-react-native/src/icons/Eye";
export { EyeSlashIcon as EyeSlash } from "phosphor-react-native/src/icons/EyeSlash";
export { FireIcon as Fire } from "phosphor-react-native/src/icons/Fire";
export { FlashlightIcon as Flashlight } from "phosphor-react-native/src/icons/Flashlight";
export { FootprintsIcon as Footprints } from "phosphor-react-native/src/icons/Footprints";
export { GearSixIcon as GearSix } from "phosphor-react-native/src/icons/GearSix";
export { GlobeIcon as Globe } from "phosphor-react-native/src/icons/Globe";
export { HouseIcon as House } from "phosphor-react-native/src/icons/House";
export { ImageIcon as ImageIconGlyph } from "phosphor-react-native/src/icons/Image";
export { LightningIcon as Lightning } from "phosphor-react-native/src/icons/Lightning";
export { LockIcon as Lock } from "phosphor-react-native/src/icons/Lock";
export { MagnifyingGlassIcon as MagnifyingGlass } from "phosphor-react-native/src/icons/MagnifyingGlass";
export { MapPinIcon as MapPin } from "phosphor-react-native/src/icons/MapPin";
export { MedalIcon as Medal } from "phosphor-react-native/src/icons/Medal";
export { MoonIcon as Moon } from "phosphor-react-native/src/icons/Moon";
export { NavigationArrowIcon as NavigationArrow } from "phosphor-react-native/src/icons/NavigationArrow";
export { PencilSimpleIcon as PencilSimple } from "phosphor-react-native/src/icons/PencilSimple";
export { PepperIcon as Pepper } from "phosphor-react-native/src/icons/Pepper";
export { PersonSimpleWalkIcon as PersonSimpleWalk } from "phosphor-react-native/src/icons/PersonSimpleWalk";
export { PlusIcon as Plus } from "phosphor-react-native/src/icons/Plus";
export { ReceiptIcon as Receipt } from "phosphor-react-native/src/icons/Receipt";
export { SealCheckIcon as SealCheck } from "phosphor-react-native/src/icons/SealCheck";
export { SignOutIcon as SignOut } from "phosphor-react-native/src/icons/SignOut";
export { SparkleIcon as Sparkle } from "phosphor-react-native/src/icons/Sparkle";
export { SquaresFourIcon as SquaresFour } from "phosphor-react-native/src/icons/SquaresFour";
export { StarIcon as Star } from "phosphor-react-native/src/icons/Star";
export { StorefrontIcon as Storefront } from "phosphor-react-native/src/icons/Storefront";
export { SunIcon as Sun } from "phosphor-react-native/src/icons/Sun";
export { TranslateIcon as Translate } from "phosphor-react-native/src/icons/Translate";
export { TrendUpIcon as TrendUp } from "phosphor-react-native/src/icons/TrendUp";
export { TrophyIcon as Trophy } from "phosphor-react-native/src/icons/Trophy";
export { WarningCircleIcon as WarningCircle } from "phosphor-react-native/src/icons/WarningCircle";
export { WifiSlashIcon as WifiSlash } from "phosphor-react-native/src/icons/WifiSlash";
export { XIcon as X } from "phosphor-react-native/src/icons/X";

// 타입 전용 import는 번들에서 지워지므로 배럴에서 가져와도 된다.
export type { Icon, IconProps } from "phosphor-react-native";
