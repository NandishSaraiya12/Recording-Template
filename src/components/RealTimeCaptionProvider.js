import {
  Constants,
  useMeeting,
  useTranslation
} from "@videosdk.live/react-sdk";
import { useEffect, useRef, useState } from "react";
import { appThemes, useMeetingAppContext } from "../MeetingAppContextDef";
import useIsMobile from "../hooks/useIsMobile";
import useIsTab from "../hooks/useIsTab";
import { useMediaQuery } from "react-responsive";
import { Typography, useTheme } from "@mui/material";
import { toast } from "react-toastify";

const RealTimeCaptionProvider = ({}) => {
  const mMeeting = useMeeting({});
  useTranslation({
    onTranslationStateChanged,
    onTranslationLanguageChanged,
    onTranslationText,
  });
  const [transcription, setTranscription] = useState();

  const {
    participantCanToggleRealtimeTranscription,
    notificationAlertsEnabled,
    meetingMode,
    appTheme,
    language:lang
  } = useMeetingAppContext();

  const isMobile = useIsMobile();
  const isTab = useIsTab();
  const isPortrait = useMediaQuery({ query: "(orientation: portrait)" });
  const theme = useTheme();

  const meetingModeRef = useRef(meetingMode);

  function onTranslationStateChanged(data) {
    let status = data.status;
    if (
      (status === "TRANSLATION_STARTED" ||
        status === "TRANSLATION_STOPPED")
    ) {
      toast(
              `${status === Constants.translationEvents.TRANSLATION_STARTED
                ? "Meeting translation is started"
                : "Meeting translation is stopped."
              }`,
              {
                position: "bottom-left",
                autoClose: 4000,
                hideProgressBar: true,
                closeButton: false,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light",
              }
            );
    }
  }
  function onTranslationText(payload) {
    console.log("translation text",payload)
    if (payload && payload.text) {
      setTranscription({
        text: payload.text,
        participantName: payload.participantName,
      });
      console.log("Translation Payload : " ,payload)
    }
  }
  function onTranslationLanguageChanged(payload) {
    console.log("Language Changed", payload)
  }

  useEffect(() => {
    if (
      mMeeting.translationState ==
      "TRANSLATION_STOPPING"
    ) {
      setTranscription(null);
    }
  }, [mMeeting.translationState]);

  return transcription ? (
    <>
      <div
        style={{
          position: "absolute",
          zIndex: 99,
          width: "100%",
          height: "auto",
          bottom: "80px", // Increased from 25px to 80px to avoid overlap with bottom bar (60px height + 20px margin)
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "left",
          color: "white",
        }}
      >
        <Typography
          variant={"subtitle2"}
          style={{
            width: "70%",

            fontSize: 20,
            // display: "flex",
            // alignItems: "center",
            // lineHeight: 1,
            color:
              appTheme === appThemes.LIGHT &&
              theme.palette.lightTheme.contrastText,
          }}
        >
          <div
            style={{
              display: "flex",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                backgroundColor:
                  appTheme === appThemes.LIGHT
                    ? theme.palette.lightTheme.three
                    : "#00000066",
                paddingTop: isMobile ? 2 : isTab ? 3 : 4,
                paddingBottom: isMobile ? 2 : isTab ? 3 : 4,
                paddingLeft: isMobile ? 4 : isTab ? 6 : 8,
                paddingRight: isMobile ? 4 : isTab ? 6 : 8,
              }}
            >
              <strong
                style={{
                  maxWidth: "10%",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: " ellipsis",
                  marginRight: "5px",
                }}
              >
                [ {transcription.participantName} ] :
              </strong>
              <span>{transcription.text}</span>
            </div>
          </div>
        </Typography>
      </div>
    </>
  ) : null;
};

export default RealTimeCaptionProvider;
