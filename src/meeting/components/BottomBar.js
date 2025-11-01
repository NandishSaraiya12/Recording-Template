import {
  Constants,
  useMeeting,
  usePubSub,
  useMediaDevice,
  useParticipant,
  useTranscription,
  useTranslation
} from "@videosdk.live/react-sdk";
import React, { Fragment, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { LANGUAGES } from "../../utils/languages";
import {
  ClipboardIcon,
  CheckIcon,
  ChevronDownIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";
// import {
//   ClosedCaption,
//   ClosedCaptionOutlined,
// } from "@mui/icons-material";
import recordingBlink from "../../static/animations/recording-blink.json";
import useIsRecording from "../../hooks/useIsRecording";
import RecordingIcon from "../../icons/Bottombar/RecordingIcon";
import MicOnIcon from "../../icons/Bottombar/MicOnIcon";
import MicOffIcon from "../../icons/Bottombar/MicOffIcon";
import WebcamOnIcon from "../../icons/Bottombar/WebcamOnIcon";
import WebcamOffIcon from "../../icons/Bottombar/WebcamOffIcon";
import ScreenShareIcon from "../../icons/Bottombar/ScreenShareIcon";
import ChatIcon from "../../icons/Bottombar/ChatIcon";
import ParticipantsIcon from "../../icons/Bottombar/ParticipantsIcon";
import EndIcon from "../../icons/Bottombar/EndIcon";
import RaiseHandIcon from "../../icons/Bottombar/RaiseHandIcon";
import PipIcon from "../../icons/Bottombar/PipIcon";
import { OutlinedButton } from "../../components/buttons/OutlinedButton";
import useIsTab from "../../hooks/useIsTab";
import useIsMobile from "../../hooks/useIsMobile";
import { MobileIconButton } from "../../components/buttons/MobileIconButton";
import { sideBarModes } from "../../utils/common";
import { Dialog, Popover, Transition } from "@headlessui/react";
import { createPopper } from "@popperjs/core";
import { useMeetingAppContext } from "../../MeetingAppContextDef";
import useMediaStream from "../../hooks/useMediaStream";
import { startParticipantRecording } from "../../api";
import useIsTranslationRunning from "../../hooks/useIsTranscriptionRunning"
import liveCC from "../../static/animations/live-cc.json";
import OutlineIconTextButton from "../../components/OutlineIconTextButton";

function PipBTN({ isMobile, isTab }) {
  const { pipMode, setPipMode } = useMeetingAppContext();
  const { presenterId } = useMeeting();

  const getRowCount = (length) => {
    return length > 2 ? 2 : length > 0 ? 1 : 0;
  };
  const getColCount = (length) => {
    return length < 2 ? 1 : length < 5 ? 2 : 3;
  };

  const pipWindowRef = useRef(null);
  const togglePipMode = async () => {
    //Check if PIP Window is active or not
    //If active we will turn it off
    if (pipWindowRef.current) {
      await document.exitPictureInPicture();
      pipWindowRef.current = null;
      return;
    }

    //Check if there's an active screen share
    if (!presenterId) {
      alert("Please wait for someone to start sharing their screen");
      return;
    }

    //Check if browser supports PIP mode else show a message to user
    if ("pictureInPictureEnabled" in document) {
      //Creating a Canvas which will render our PIP Stream
      const source = document.createElement("canvas");
      const ctx = source.getContext("2d");

      //Create a Video tag which we will popout for PIP
      const pipVideo = document.createElement("video");
      pipWindowRef.current = pipVideo;
      pipVideo.autoplay = true;

      //Creating stream from canvas which we will play
      const stream = source.captureStream();
      pipVideo.srcObject = stream;
      drawCanvas();

      //When Video is ready we will start PIP mode
      pipVideo.onloadedmetadata = () => {
        pipVideo.requestPictureInPicture();
      };
      await pipVideo.play();

      //When the PIP mode starts, we will start drawing canvas with PIP view
      pipVideo.addEventListener("enterpictureinpicture", (event) => {
        drawCanvas();
        setPipMode(true);
      });

      //When PIP mode exits, we will dispose the track we created earlier
      pipVideo.addEventListener("leavepictureinpicture", (event) => {
        pipWindowRef.current = null;
        setPipMode(false);
        pipVideo.srcObject.getTracks().forEach((track) => track.stop());
      });

      //These will draw all the video elements in to the Canvas
      function drawCanvas() {
        //Getting all the video elements in the document
        const allVideos = document.querySelectorAll("video");
        
        //Filter to only get screen share videos
        const screenShareVideos = Array.from(allVideos).filter(video => {
          // Check multiple possible identifiers for screen share videos
          
          // 1. Check if video has data attribute for stream type (VideoSDK adds this)
          const streamType = video.getAttribute('data-stream-type');
          if (streamType === 'share') {
            return true;
          }
          
          // 2. Check parent containers for the screen share data attribute we added
          let parent = video.parentElement;
          let depth = 0;
          while (parent && depth < 15) {
            const screenShareContainer = parent.getAttribute('data-screen-share-container');
            const presenterView = parent.getAttribute('data-presenter-view');
            
            if (screenShareContainer === 'true' || presenterView === 'true') {
              return true;
            }
            
            // 3. Check if parent has an id or class that indicates screen share
            const parentId = parent.id || '';
            const parentClass = parent.className || '';
            
            if (parentId.includes('presenter') || 
                parentId.includes('screen') ||
                parentClass.includes('presenter') ||
                parentClass.includes('screen-share')) {
              return true;
            }
            
            parent = parent.parentElement;
            depth++;
          }
          
          // 4. Check if video has an id or class that indicates screen share
          const videoId = video.id || '';
          const videoClass = video.className || '';
          if (videoId.includes('share') || videoClass.includes('share')) {
            return true;
          }
          
          return false;
        });
        
        // Use screen share videos, or fall back to all videos if no screen share found
        const videos = screenShareVideos.length > 0 ? screenShareVideos : allVideos;
        
        try {
          //Perform initial black paint on the canvas
          ctx.fillStyle = "black";
          ctx.fillRect(0, 0, source.width, source.height);

          // Drawing the screen share video (or single video) in full canvas
          if (videos.length > 0) {
            // For screen share, draw it full screen instead of grid
            ctx.drawImage(
              videos[0],
              0,
              0,
              source.width,
              source.height
            );
          }
        } catch (error) {
          console.log(error);
        }

        //If pip mode is on, keep drawing the canvas when ever new frame is requested
        if (document.pictureInPictureElement === pipVideo) {
          requestAnimationFrame(drawCanvas);
        }
      }
    } else {
      alert("PIP is not supported by your browser");
    }
  };

  return isMobile || isTab ? (
    <MobileIconButton
      id="pip-btn"
      tooltipTitle={pipMode ? "Stop PiP" : "Start Pip"}
      buttonText={pipMode ? "Stop PiP" : "Start Pip"}
      isFocused={pipMode}
      Icon={PipIcon}
      onClick={() => {
        togglePipMode();
      }}
      disabled={false}
    />
  ) : (
    <OutlinedButton
      Icon={PipIcon}
      onClick={() => {
        togglePipMode();
      }}
      isFocused={pipMode}
      tooltip={pipMode ? "Stop PiP" : "Start Pip"}
      disabled={false}
    />
  );
}

const MicBTN = () => {
  const {
    selectedMic,
    setSelectedMic,
    selectedSpeaker,
    setSelectedSpeaker,
    isMicrophonePermissionAllowed,
  } = useMeetingAppContext();

  const { getMicrophones, getPlaybackDevices } = useMediaDevice();

  const mMeeting = useMeeting();
  const [mics, setMics] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const localMicOn = mMeeting?.localMicOn;
  const changeMic = mMeeting?.changeMic;

  useMediaDevice({
    onDeviceChanged
  })

  function onDeviceChanged(devices) {
    getMics();
    const newSpeakerList = devices.devices.filter(device => device.kind === 'audiooutput');

    if (newSpeakerList.length > 0) {
      setSelectedSpeaker({ id: newSpeakerList[0].deviceId, label: newSpeakerList[0].label });
    }

  }



  const getMics = async () => {
    const mics = await getMicrophones();
    const speakers = await getPlaybackDevices();

    mics && mics?.length && setMics(mics);
    speakers && speakers?.length && setSpeakers(speakers);
  };

  const [tooltipShow, setTooltipShow] = useState(false);
  const btnRef = useRef();
  const tooltipRef = useRef();

  const openTooltip = () => {
    createPopper(btnRef.current, tooltipRef.current, {
      placement: "top",
    });
    setTooltipShow(true);
  };
  const closeTooltip = () => {
    setTooltipShow(false);
  };

  return (
    <>
      <OutlinedButton
        Icon={localMicOn ? MicOnIcon : MicOffIcon}
        onClick={() => {
          mMeeting.toggleMic();
        }}
        bgColor={localMicOn ? "bg-gray-750" : "bg-white"}
        borderColor={localMicOn && "#ffffff33"}
        isFocused={localMicOn}
        focusIconColor={localMicOn && "white"}
        tooltip={"Toggle Mic"}
        renderRightComponent={() => {
          return (
            <>
              <Popover className="relative">
                {({ close }) => (
                  <>
                    <Popover.Button
                      disabled={!isMicrophonePermissionAllowed}
                      className="flex items-center justify-center mt-1 mr-1 focus:outline-none"
                    >
                      <div
                        ref={btnRef}
                        onMouseEnter={openTooltip}
                        onMouseLeave={closeTooltip}
                      >
                        <button
                          onClick={() => {
                            getMics();
                          }}
                        >
                          <ChevronDownIcon
                            className="h-4 w-4"
                            style={{
                              color: mMeeting.localMicOn ? "white" : "black",
                            }}
                          />
                        </button>
                      </div>
                    </Popover.Button>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="opacity-0 translate-y-1"
                      enterTo="opacity-100 translate-y-0"
                      leave="transition ease-in duration-150"
                      leaveFrom="opacity-100 translate-y-0"
                      leaveTo="opacity-0 translate-y-1"
                    >
                      <Popover.Panel className="absolute left-1/2 bottom-full z-10 mt-3 w-72 -translate-x-1/2 transform px-4 sm:px-0 pb-4">
                        <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                          <div className={" bg-gray-750 py-1"}>
                            <div>
                              <div className="flex items-center p-3 pb-0">
                                <p className="ml-3 text-sm text-gray-900">
                                  {"MICROPHONE"}
                                </p>
                              </div>
                              <div className="flex flex-col">
                                {mics.map(({ deviceId, label }, index) => (
                                  <div
                                    className={`px-3 py-1 my-1 pl-6 text-white text-left ${deviceId === selectedMic.id &&
                                      "bg-gray-150"
                                      }`}
                                  >
                                    <button
                                      className={`flex flex-1 w-full text-left ${deviceId === selectedMic.id &&
                                        "bg-gray-150"
                                        }`}
                                      key={`mics_${deviceId}`}
                                      onClick={() => {
                                        setSelectedMic({ id: deviceId });
                                        changeMic(deviceId);
                                        close();
                                      }}
                                    >
                                      {label || `Mic ${index + 1}`}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <hr className="border border-gray-50 mt-2 mb-1" />
                            <div>
                              <div className="flex p-3 pb-0">
                                <p className="ml-3 text-sm text-gray-900  text-center">
                                  {"SPEAKER"}
                                </p>
                              </div>
                              <div className="flex flex-col ">
                                {speakers.map(({ deviceId, label }, index) => (
                                  <div
                                    className={`px-3 py-1 my-1 pl-6 text-white ${deviceId === selectedSpeaker.id &&
                                      "bg-gray-150"
                                      }`}
                                  >
                                    <button
                                      className={`flex flex-1 w-full text-left ${deviceId === selectedSpeaker.id &&
                                        "bg-gray-150"
                                        }`}
                                      key={`speakers_${deviceId}`}
                                      onClick={() => {
                                        setSelectedSpeaker({ id: deviceId });
                                        close();
                                      }}
                                    >
                                      {label || `Speaker ${index + 1}`}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Popover.Panel>
                    </Transition>
                  </>
                )}
              </Popover>
              <div
                style={{ zIndex: 999 }}
                className={`${tooltipShow ? "" : "hidden"
                  } overflow-hidden flex flex-col items-center justify-center pb-4`}
                ref={tooltipRef}
              >
                <div className={"rounded-md p-1.5 bg-black "}>
                  <p className="text-base text-white ">{"Change microphone"}</p>
                </div>
              </div>
            </>
          );
        }}
      />
    </>
  );
};

const WebCamBTN = () => {
  const { selectedWebcam, setSelectedWebcam, isCameraPermissionAllowed } =
    useMeetingAppContext();

  const { getCameras } = useMediaDevice();
  const mMeeting = useMeeting();
  const [webcams, setWebcams] = useState([]);
  const { getVideoTrack } = useMediaStream();

  const localWebcamOn = mMeeting?.localWebcamOn;
  const changeWebcam = mMeeting?.changeWebcam;

  const getWebcams = async () => {
    let webcams = await getCameras();
    webcams && webcams?.length && setWebcams(webcams);
  };

  const [tooltipShow, setTooltipShow] = useState(false);
  const btnRef = useRef();
  const tooltipRef = useRef();

  const openTooltip = () => {
    createPopper(btnRef.current, tooltipRef.current, {
      placement: "top",
    });
    setTooltipShow(true);
  };
  const closeTooltip = () => {
    setTooltipShow(false);
  };

  return (
    <>
      <OutlinedButton
        Icon={localWebcamOn ? WebcamOnIcon : WebcamOffIcon}
        onClick={async () => {
          let track;
          if (!localWebcamOn) {
            track = await getVideoTrack({
              webcamId: selectedWebcam.id,
            });
          }
          mMeeting.toggleWebcam(track);
        }}
        bgColor={localWebcamOn ? "bg-gray-750" : "bg-white"}
        borderColor={localWebcamOn && "#ffffff33"}
        isFocused={localWebcamOn}
        focusIconColor={localWebcamOn && "white"}
        tooltip={"Toggle Webcam"}
        renderRightComponent={() => {
          return (
            <>
              <Popover className="relative">
                {({ close }) => (
                  <>
                    <Popover.Button
                      disabled={!isCameraPermissionAllowed}
                      className="flex items-center justify-center mt-1 mr-1 focus:outline-none"
                    >
                      <div
                        ref={btnRef}
                        onMouseEnter={openTooltip}
                        onMouseLeave={closeTooltip}
                      >
                        <button
                          onClick={() => {
                            getWebcams();
                          }}
                        >
                          <ChevronDownIcon
                            className="h-4 w-4"
                            style={{
                              color: localWebcamOn ? "white" : "black",
                            }}
                          />
                        </button>
                      </div>
                    </Popover.Button>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="opacity-0 translate-y-1"
                      enterTo="opacity-100 translate-y-0"
                      leave="transition ease-in duration-150"
                      leaveFrom="opacity-100 translate-y-0"
                      leaveTo="opacity-0 translate-y-1"
                    >
                      <Popover.Panel className="absolute left-1/2 bottom-full z-10 mt-3 w-72 -translate-x-1/2 transform px-4 sm:px-0 pb-4">
                        <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                          <div className={" bg-gray-750 py-1"}>
                            <div>
                              <div className="flex items-center p-3 pb-0">
                                <p className="ml-3 text-sm text-gray-900">
                                  {"WEBCAM"}
                                </p>
                              </div>
                              <div className="flex flex-col">
                                {webcams.map(({ deviceId, label }, index) => (
                                  <div
                                    className={`px-3 py-1 my-1 pl-6 text-white ${deviceId === selectedWebcam.id &&
                                      "bg-gray-150"
                                      }`}
                                  >
                                    <button
                                      className={`flex flex-1 w-full text-left ${deviceId === selectedWebcam.id &&
                                        "bg-gray-150"
                                        }`}
                                      key={`output_webcams_${deviceId}`}
                                      onClick={() => {
                                        setSelectedWebcam({ id: deviceId });
                                        changeWebcam(deviceId);
                                        close();
                                      }}
                                    >
                                      {label || `Webcam ${index + 1}`}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Popover.Panel>
                    </Transition>
                  </>
                )}
              </Popover>
              <div
                style={{ zIndex: 999 }}
                className={`${tooltipShow ? "" : "hidden"
                  } overflow-hidden flex flex-col items-center justify-center pb-4`}
                ref={tooltipRef}
              >
                <div className={"rounded-md p-1.5 bg-black "}>
                  <p className="text-base text-white ">{"Change webcam"}</p>
                </div>
              </div>
            </>
          );
        }}
      />
    </>
  );
};

export function BottomBar({ token, meetingId, bottomBarHeight, setIsMeetingLeft, language, setLanguage }) {
  const { sideBarMode, setSideBarMode } = useMeetingAppContext();
  const { changeTranslationLanguage } = useTranslation();
  const RaiseHandBTN = ({ isMobile, isTab }) => {
    const { publish } = usePubSub("RAISE_HAND");
    const RaiseHand = () => {
      const raiseHandData = {
        type: "RAISE_HAND",
        message: "Raise Hand",
        timestamp: Date.now(),
        blob: "X".repeat(5120), // 64KB blob
      };

      for (let i = 0; i < 100; i++) {
        publish(raiseHandData, { persist: true });
      }
    };

    return isMobile || isTab ? (
      <MobileIconButton
        id="RaiseHandBTN"
        tooltipTitle={"Raise hand"}
        Icon={RaiseHandIcon}
        onClick={RaiseHand}
        buttonText={"Raise Hand"}
      />
    ) : (
      <OutlinedButton
        onClick={RaiseHand}
        tooltip={"Raise Hand"}
        Icon={RaiseHandIcon}
      />
    );
  };

  const RecordingBTN = () => {
    const { startRecording, stopRecording, recordingState } = useMeeting();
    const defaultOptions = {
      loop: true,
      autoplay: true,
      animationData: recordingBlink,
      rendererSettings: {
        preserveAspectRatio: "xMidYMid slice",
      },
      height: 64,
      width: 160,
    };

    const isRecording = useIsRecording();
    const isRecordingRef = useRef(isRecording);

    useEffect(() => {
      isRecordingRef.current = isRecording;
    }, [isRecording]);

    const { isRequestProcessing } = useMemo(
      () => ({
        isRequestProcessing:
          recordingState === Constants.recordingEvents.RECORDING_STARTING ||
          recordingState === Constants.recordingEvents.RECORDING_STOPPING,
      }),
      [recordingState]
    );

    const _handleClick = () => {
      const isRecording = isRecordingRef.current;

      if (isRecording) {
        stopRecording();
      } else {
        // startParticipantRecording({roomId : meetingId,participantId : localParticipant.id, token});
        startRecording()
      }
    };

    return (
      <OutlinedButton
        Icon={RecordingIcon}
        onClick={_handleClick}
        isFocused={isRecording}
        tooltip={
          recordingState === Constants.recordingEvents.RECORDING_STARTED
            ? "Stop Recording"
            : recordingState === Constants.recordingEvents.RECORDING_STARTING
              ? "Starting Recording"
              : recordingState === Constants.recordingEvents.RECORDING_STOPPED
                ? "Start Recording"
                : recordingState === Constants.recordingEvents.RECORDING_STOPPING
                  ? "Stopping Recording"
                  : "Start Recording"
        }
        lottieOption={isRecording ? defaultOptions : null}
        isRequestProcessing={isRequestProcessing}
      />
    );
  };

  const ScreenShareBTN = ({ isMobile, isTab }) => {
    const { localScreenShareOn, toggleScreenShare, presenterId } = useMeeting();
    return isMobile || isTab ? (
      <MobileIconButton
        id="screen-share-btn"
        tooltipTitle={
          presenterId
            ? localScreenShareOn
              ? "Stop Presenting"
              : null
            : "Present Screen"
        }
        buttonText={
          presenterId
            ? localScreenShareOn
              ? "Stop Presenting"
              : null
            : "Present Screen"
        }
        isFocused={localScreenShareOn}
        Icon={ScreenShareIcon}
        onClick={() => {
          toggleScreenShare();
        }}
        disabled={
          presenterId
            ? localScreenShareOn
              ? false
              : true
            : isMobile
              ? true
              : false
        }
      />
    ) : (
      <OutlinedButton
        Icon={ScreenShareIcon}
        onClick={() => {
          toggleScreenShare()
        }}
        isFocused={localScreenShareOn}
        tooltip={
          presenterId
            ? localScreenShareOn
              ? "Stop Presenting"
              : null
            : "Present Screen"
        }
        disabled={presenterId ? (localScreenShareOn ? false : true) : false}
      />
    );
  };

  const TranscriptionBTN = ({ isMobile, isTab }) => {
    const { startTranslation, stopTranslation } = useTranslation();
    const mMeeting = useMeeting({});
    //const theme = useTheme();
    const translationState = mMeeting.translationState;

    const isTranslationRunning = useIsTranslationRunning();
    const { participantCanToggleRealtimeTranscription, appTheme } =
      useMeetingAppContext();
    const { isRequestProcessing } = useMemo(
      () => ({
        isRequestProcessing:
          translationState ===
          Constants.translationEvents.TRANSLATION_STARTING ||
          translationState ===
          Constants.translationEvents.TRANSLATION_STOPPING,
      }),
      [translationState]
    );
    const isTranslationRunningRef = useRef(isTranslationRunning);

    useEffect(() => {
      isTranslationRunningRef.current = isTranslationRunning;
    }, [isTranslationRunning]);

    const _handleClick = () => {
      const isTranslationRunning = isTranslationRunningRef.current;

      if (isTranslationRunning) {
        stopTranslation();
      } else {
        startTranslation();
      }
    };

    const defaultOptions = {
      loop: true,
      autoplay: true,
      animationData: liveCC,
      rendererSettings: {
        preserveAspectRatio: "xMidYMid slice",
      },
      iconScale: "scale(+5)",
      height: 70,
      width: 100,
    };
    return (
      <>
        {isMobile || isTab ? (
          <MobileIconButton
            // Icon={
            //   transcriptionState ===
            //     Constants.transcriptionEvents.TRANSCRIPTION_STARTED
            //     ? ClosedCaption
            //     : ClosedCaptionOutlined
            // }
            onClick={_handleClick}
            tooltipTitle={
              translationState ===
                Constants.translationEvents.TRANSLATION_STARTED
                ? "Stop Translation"
                : translationState ===
                  Constants.translationEvents.TRANSLATION_STARTING
                  ? "Starting Translation"
                  : translationState ===
                    Constants.translationEvents.TRANSLATION_STOPPED
                    ? "Start Translation"
                    : translationState ===
                      Constants.translationEvents.TRANSLATION_STOPPING
                      ? "Stopping Translation"
                      : "Start Translation"
            }
            isFocused={isTranslationRunning}
            bgColor={
              translationState === Constants.translationEvents.TRANSLATION_STARTED
                ? "bg-blue-600" // Use blue background when translation is active like recording button
                : translationState === Constants.translationEvents.TRANSLATION_STOPPING
                  ? "bg-gray-400"
                  : "bg-gray-750" // Default background
            }
            buttonText={
              translationState ===
                Constants.translationEvents.TRANSLATION_STARTED
                ? "Stop Translation"
                : translationState ===
                  Constants.translationEvents.TRANSLATION_STARTING
                  ? "Starting Translation"
                  : translationState ===
                    Constants.translationEvents.TRANSLATION_STOPPED
                    ? "Start Translation"
                    : translationState ===
                      Constants.translationEvents.TRANSLATION_STOPPING
                      ? "Stopping Translation"
                      : "Start Translation"
            }
            isRequestProcessing={isRequestProcessing}
          />
        ) : (
          <OutlineIconTextButton
            customBtnWidth={"50px"}
            onClick={_handleClick}
            bgColor={
              translationState === Constants.translationEvents.TRANSLATION_STARTED
                ? "#fff" // Use Tailwind class like recording button
                : translationState === Constants.translationEvents.TRANSLATION_STOPPING
                  ? "bg-gray-400" : "bg-gray" // Default background like other buttons
            }
            buttonText={
              translationState ===
                Constants.translationEvents.TRANSLATION_STARTED
                ? "CC"
                : translationState ===
                  Constants.translationEvents.TRANSLATION_STARTING
                  ? "CC"
                  : translationState ===
                    Constants.translationEvents.TRANSLATION_STOPPED
                    ? "CC"
                    : translationState ===
                      Constants.translationEvents.TRANSLATION_STOPPING
                      ? "CC"
                      : "CC"
            }
            tooltipTitle={
              translationState ===
                Constants.translationEvents.TRANSLATION_STARTED
                ? "Stop Translation"
                : translationState ===
                  Constants.translationEvents.TRANSLATION_STARTING
                  ? "Starting Translation"
                  : translationState ===
                    Constants.translationEvents.TRANSLATION_STOPPED
                    ? "Start Translation"
                    : translationState ===
                      Constants.translationEvents.TRANSLATION_STOPPING
                      ? "Stopping Translation"
                      : "Start Translation"
            }
            isFocused={isTranslationRunning}
            focusIconColor={isTranslationRunning && "white"} // Add focus icon color like recording button
            lottieOption={
              translationState ==
                Constants.translationEvents.TRANSLATION_STARTING
                ? defaultOptions
                : null
            }
            disabled={false}
            isRequestProcessing={isRequestProcessing}
          />
        )}
      </>
    );
  };

  const LeaveBTN = () => {
    const { leave } = useMeeting();

    return (
      <OutlinedButton
        Icon={EndIcon}
        bgColor="bg-red-150"
        onClick={() => {
          leave();
          setIsMeetingLeft(true);
        }}
        tooltip="Leave Meeting"
      />
    );
  };

  const ChatBTN = ({ isMobile, isTab }) => {
    return isMobile || isTab ? (
      <MobileIconButton
        tooltipTitle={"Chat"}
        buttonText={"Chat"}
        Icon={ChatIcon}
        isFocused={sideBarMode === sideBarModes.CHAT}
        onClick={() => {
          setSideBarMode((s) =>
            s === sideBarModes.CHAT ? null : sideBarModes.CHAT
          );
        }}
      />
    ) : (
      <OutlinedButton
        Icon={ChatIcon}
        onClick={() => {
          setSideBarMode((s) =>
            s === sideBarModes.CHAT ? null : sideBarModes.CHAT
          );
        }}
        isFocused={sideBarMode === "CHAT"}
        tooltip="View Chat"
      />
    );
  };

  const ParticipantsBTN = ({ isMobile, isTab }) => {
    const { participants } = useMeeting();
    return isMobile || isTab ? (
      <MobileIconButton
        tooltipTitle={"Participants"}
        isFocused={sideBarMode === sideBarModes.PARTICIPANTS}
        buttonText={"Participants"}
        disabledOpacity={1}
        Icon={ParticipantsIcon}
        onClick={() => {
          setSideBarMode((s) =>
            s === sideBarModes.PARTICIPANTS ? null : sideBarModes.PARTICIPANTS
          );
        }}
        badge={`${new Map(participants)?.size}`}
      />
    ) : (
      <OutlinedButton
        Icon={ParticipantsIcon}
        onClick={() => {
          setSideBarMode((s) =>
            s === sideBarModes.PARTICIPANTS ? null : sideBarModes.PARTICIPANTS
          );
        }}
        isFocused={sideBarMode === sideBarModes.PARTICIPANTS}
        tooltip={"View \nParticipants"}
        badge={`${new Map(participants)?.size}`}
      />
    );
  };

  const handleLanguageChange = useCallback((e) => {
    setLanguage(e);
    changeTranslationLanguage(e);
  }, [setLanguage, changeTranslationLanguage]);

  const LanguageSelectorBTN = useMemo(() => {
    return (
      <select
        value={language}
        onChange={(e) => handleLanguageChange(e.target.value)}
        className="px-4 py-3 mt-5 bg-gray-650 rounded-xl text-white w-auto text-center pr-8"
      >
        <option value="" disabled>
          Select your language
        </option>
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    );
  }, [language, handleLanguageChange]);


  const tollTipEl = useRef();
  const isMobile = useIsMobile();
  const isTab = useIsTab();
  const [open, setOpen] = useState(false);

  const handleClickFAB = () => {
    setOpen(true);
  };

  const handleCloseFAB = () => {
    setOpen(false);
  };

  const BottomBarButtonTypes = useMemo(
    () => ({
      END_CALL: "END_CALL",
      CHAT: "CHAT",
      PARTICIPANTS: "PARTICIPANTS",
      SCREEN_SHARE: "SCREEN_SHARE",
      WEBCAM: "WEBCAM",
      MIC: "MIC",
      RAISE_HAND: "RAISE_HAND",
      RECORDING: "RECORDING",
      PIP: "PIP",
      LANGUAGE_SELECTOR: "LANGUAGE_SELECTOR",
    }),
    []
  );

  const otherFeatures = [
    { icon: BottomBarButtonTypes.RAISE_HAND },
    { icon: BottomBarButtonTypes.PIP },
    { icon: BottomBarButtonTypes.SCREEN_SHARE },
    { icon: BottomBarButtonTypes.CHAT },
    { icon: BottomBarButtonTypes.PARTICIPANTS },
    { icon: BottomBarButtonTypes.LANGUAGE_SELECTOR },
  ];

  return isMobile || isTab ? (
    <div
      className="flex items-center justify-center"
      style={{ height: bottomBarHeight }}
    >
      <LeaveBTN />
      <TranscriptionBTN />
      <MicBTN />
      <WebCamBTN />
      <RecordingBTN />
      <OutlinedButton Icon={EllipsisHorizontalIcon} onClick={handleClickFAB} />
      <Transition appear show={Boolean(open)} as={Fragment}>
        <Dialog
          as="div"
          className="relative"
          style={{ zIndex: 9999 }}
          onClose={handleCloseFAB}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="translate-y-full opacity-0 scale-95"
            enterTo="translate-y-0 opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="translate-y-0 opacity-100 scale-100"
            leaveTo="translate-y-full opacity-0 scale-95"
          >
            <div className="fixed inset-0 overflow-y-hidden">
              <div className="flex h-full items-end justify-end text-center">
                <Dialog.Panel className="w-screen transform overflow-hidden bg-gray-800 shadow-xl transition-all">
                  <div className="grid container bg-gray-800 py-6">
                    <div className="grid grid-cols-12 gap-2">
                      {otherFeatures.map(({ icon }) => {
                        return (
                          <div
                            className={`grid items-center justify-center ${icon === BottomBarButtonTypes.LANGUAGE_SELECTOR
                              ? "col-span-7 sm:col-span-5 md:col-span-3"
                              : "col-span-4 sm:col-span-3 md:col-span-2"
                              }`}
                          >
                            {icon === BottomBarButtonTypes.RAISE_HAND ? (
                              <RaiseHandBTN isMobile={isMobile} isTab={isTab} />
                            ) : icon === BottomBarButtonTypes.SCREEN_SHARE ? (
                              <ScreenShareBTN
                                isMobile={isMobile}
                                isTab={isTab}
                              />
                            ) : icon === BottomBarButtonTypes.CHAT ? (
                              <ChatBTN isMobile={isMobile} isTab={isTab} />
                            ) : icon === BottomBarButtonTypes.PARTICIPANTS ? (
                              <ParticipantsBTN
                                isMobile={isMobile}
                                isTab={isTab}
                              />
                            ) : icon === BottomBarButtonTypes.LANGUAGE_SELECTOR ? (
                              LanguageSelectorBTN
                            ) : icon === BottomBarButtonTypes.PIP ? (
                              <PipBTN isMobile={isMobile} isTab={isTab} />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Dialog.Panel>
              </div>
            </div>
          </Transition.Child>
        </Dialog>
      </Transition>
    </div>
  ) : (
    <div className="md:flex lg:px-2 xl:px-6 pb-2 px-2 hidden">
      {LanguageSelectorBTN}

      <div className="flex flex-1 items-center justify-center" ref={tollTipEl}>
        <RecordingBTN />
        <RaiseHandBTN isMobile={isMobile} isTab={isTab} />
        <MicBTN />
        <WebCamBTN />
        <ScreenShareBTN isMobile={isMobile} isTab={isTab} />
        <PipBTN isMobile={isMobile} isTab={isTab} />
        <TranscriptionBTN />
        <LeaveBTN />
      </div>
      <div className="flex items-center justify-center">
        <ChatBTN isMobile={isMobile} isTab={isTab} />
        <ParticipantsBTN isMobile={isMobile} isTab={isTab} />
      </div>
    </div>
  );
}
