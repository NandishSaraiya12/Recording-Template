import { MeetingProvider } from "@videosdk.live/react-sdk";
import { StrictMode, useEffect } from "react";
import { useState } from "react";
import { MeetingAppProvider } from "./MeetingAppContextDef";
import { MeetingContainer } from "./meeting/MeetingContainer";
import { LeaveScreen } from "./components/screens/LeaveScreen";
import { JoiningScreen } from "./components/screens/JoiningScreen";

function App() {
  const [token, setToken] = useState("");
  const [meetingId, setMeetingId] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [micOn, setMicOn] = useState(false);
  const [webcamOn, setWebcamOn] = useState(false);
  const [customAudioStream, setCustomAudioStream] = useState(null);
  const [customVideoStream, setCustomVideoStream] = useState(null)
  const [isMeetingStarted, setMeetingStarted] = useState(false);
  const [isMeetingLeft, setIsMeetingLeft] = useState(false);
  const [language, setLanguage] = useState("");
  const [participantId, setParticipantId] = useState("")


  const isMobile = window.matchMedia(
    "only screen and (max-width: 768px)"
  ).matches;

  // Get meetingId, token and participantId from URL params and start meeting
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const meetingIdFromUrl = urlParams.get('meetingId');
    const tokenFromUrl = urlParams.get('token');
    const participantIdFromUrl = urlParams.get('participantId');
    const participantNameFromUrl = urlParams.get('participantName');

    if (meetingIdFromUrl && tokenFromUrl) {
      setMeetingId(meetingIdFromUrl);
      setToken(tokenFromUrl);
      setParticipantId(participantIdFromUrl);
      if (participantNameFromUrl) {
        setParticipantName(participantNameFromUrl);
      }
      setMeetingStarted(true);
    }

    console.log("Values from URL:", {
      meetingId: meetingIdFromUrl,
      token: tokenFromUrl,
      participantId: participantIdFromUrl,
      participantName: participantNameFromUrl
    });
  }, []);

  useEffect(() => {
    if (isMobile) {
      window.onbeforeunload = () => {
        return "Are you sure you want to exit?";
      };
    }
  }, [isMobile]);

  return (
    <>
      <MeetingAppProvider
        language={language}
      >
        {isMeetingStarted ? (

          <MeetingProvider
            config={{
              meetingId,
              micEnabled: micOn,
              webcamEnabled: webcamOn,
              name: participantName ? participantName : "TestUser",
              multiStream: true,
              defaultCamera: "environment",
              // customCameraVideoTrack: customVideoStream,
              // customMicrophoneAudioTrack: customAudioStream'
              translationLanguage: "en",
              speakingLanguage: "en",
              participantId: participantId,
              metaData: {
                participantMode: "agent",
              },
            }}
            token={token}
            reinitialiseMeetingOnConfigChange={true}
            joinWithoutUserInteraction={true}
          >
            <MeetingContainer
              token={token}
              meetingId={meetingId}
              onMeetingLeave={() => {
                setToken("");
                setMeetingId("");
                setParticipantName("");
                setWebcamOn(false);
                setMicOn(false);
                setMeetingStarted(false);
              }}
              setIsMeetingLeft={setIsMeetingLeft}
              language={language}
              setLanguage={setLanguage}
            />
          </MeetingProvider>

        ) : isMeetingLeft ? (
          <LeaveScreen setIsMeetingLeft={setIsMeetingLeft} />
        ) : (

          <JoiningScreen
            participantName={participantName}
            setParticipantName={setParticipantName}
            language={language}
            setLanguage={setLanguage}
            setMeetingId={setMeetingId}
            setToken={setToken}
            micOn={micOn}
            setMicOn={setMicOn}
            webcamOn={webcamOn}
            setWebcamOn={setWebcamOn}
            customAudioStream={customAudioStream}
            setCustomAudioStream={setCustomAudioStream}
            customVideoStream={customVideoStream}
            setCustomVideoStream={setCustomVideoStream}
            onClickStartMeeting={() => {
              setMeetingStarted(true);
            }}
            startMeeting={isMeetingStarted}
            setIsMeetingLeft={setIsMeetingLeft}
          />
        )}
      </MeetingAppProvider>
    </>
  );
}

export default App;
