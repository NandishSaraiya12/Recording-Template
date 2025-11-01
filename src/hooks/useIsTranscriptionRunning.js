import { useMemo } from "react";
import { Constants, useMeeting } from "@videosdk.live/react-sdk";

const useIsTranslationRunning = () => {
  const { translationState } = useMeeting();

  const isTranslationRunning = useMemo(
    () =>
      translationState ===
        Constants.translationEvents.TRANSLATION_STARTED ||
      translationState ===
        Constants.translationEvents.TRANSLATION_STOPPING,
    [translationState]
  );

  return isTranslationRunning;
};

export default useIsTranslationRunning;
