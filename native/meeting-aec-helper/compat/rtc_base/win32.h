// Stub: webrtc-apm omits rtc_base/win32.h but time_utils.cc includes it under
// WEBRTC_WIN. The symbols actually referenced (FILETIME, etc.) come from
// <minwinbase.h>, which is included separately.
#ifndef OPENWHISPR_COMPAT_RTC_BASE_WIN32_H_
#define OPENWHISPR_COMPAT_RTC_BASE_WIN32_H_
#endif
