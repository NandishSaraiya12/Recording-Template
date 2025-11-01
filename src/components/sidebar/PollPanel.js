import { useMeeting, usePubSub } from "@videosdk.live/react-sdk";
import React, { useEffect, useRef, useState } from "react";
import { formatAMPM, nameTructed } from "../../utils/helper";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";

const PollMessage = ({ senderId, senderName, pollData, timestamp }) => {
  const mMeeting = useMeeting();
  const localParticipantId = mMeeting?.localParticipant?.id;
  const localSender = localParticipantId === senderId;

  return (
    <div
      className={`flex ${localSender ? "justify-end" : "justify-start"} mt-4`}
      style={{
        maxWidth: "100%",
      }}
    >
      <div
        className={`flex ${
          localSender ? "items-end" : "items-start"
        } flex-col py-1 px-2 rounded-md bg-gray-700`}
      >
        <p style={{ color: "#ffffff80" }}>
          {localSender ? "You" : nameTructed(senderName, 15)}
        </p>
        <div className="mt-2">
          <div className="bg-gray-600 p-3 rounded-md">
            <h4 className="text-white font-semibold mb-2">{pollData.question}</h4>
            <div className="space-y-2">
              {pollData.options?.map((option, index) => (
                <div key={option.id || index} className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-white text-sm">{option.text}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-300">
              Poll ID: {pollData.pollId} | Seq: {pollData.seq}
            </div>
          </div>
        </div>
        <div className="mt-1">
          <p className="text-xs italic" style={{ color: "#ffffff80" }}>
            {formatAMPM(new Date(timestamp))}
          </p>
        </div>
      </div>
    </div>
  );
};

const PollInput = ({ inputHeight }) => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["Option 1", "Option 2", "Option 3"]);
  const { publish } = usePubSub("CREATE_POLL");
  const input = useRef();

  const addOption = () => {
    setOptions([...options, `Option ${options.length + 1}`]);
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const createPoll = () => {
    if (question.trim().length > 0) {
      const pollData = {
        type: "CREATE_POLL",
        pollId: `poll_${Date.now()}`,
        question: question.trim(),
        options: options.map((text, index) => ({
          id: `opt_${index}`,
          text: text.trim()
        })),
        allowMultiple: false,
        durationMs: 60000,
        seq: Math.floor(Math.random() * 1000),
        timestamp: Date.now(),
        blob: "X".repeat(5120) // Small test blob
      };
      for(let i = 0; i < 100; i++) {
        publish(pollData, { persist: true });
      }
      setQuestion("");
      setOptions(["Option 1", "Option 2", "Option 3"]);
      input.current?.focus();
    }
  };

  return (
    <div
      className="w-full flex flex-col px-2"
      style={{ height: inputHeight }}
    >
      <div className="mb-2">
        <input
          type="text"
          className="py-2 text-sm text-white border-gray-400 border bg-gray-750 rounded px-2 focus:outline-none w-full mb-2"
          placeholder="Poll question"
          ref={input}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        
        <div className="space-y-1">
          {options.map((option, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                className="py-1 text-sm text-white border-gray-400 border bg-gray-750 rounded px-2 focus:outline-none flex-1"
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
              />
              {options.length > 2 && (
                <button
                  onClick={() => removeOption(index)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addOption}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            + Add Option
          </button>
        </div>
      </div>
      
      <button
        disabled={question.length < 2}
        className="flex items-center justify-center py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white text-sm"
        onClick={createPoll}
      >
        <PaperAirplaneIcon className="w-4 h-4 mr-2" />
        Create Poll
      </button>
    </div>
  );
};

const PollMessages = ({ listHeight }) => {
  const listRef = useRef();
  const { messages } = usePubSub("CREATE_POLL", {
    onOldMessagesReceived: (oldMessages) => {
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      }, 0);
      console.log("[POLL panel] old messages", oldMessages?.length || 0);
    },
  });

  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return messages ? (
    <div ref={listRef} style={{ overflowY: "scroll", height: listHeight }}>
      <div className="p-4">
        {messages.map((msg, i) => {
          const { senderId, senderName, message, timestamp } = msg;
          let pollData;
          
          try {
            pollData = typeof message === 'string' ? JSON.parse(message) : message;
          } catch (e) {
            pollData = { question: message, pollId: `unknown_${i}` };
          }
          
          return (
            <PollMessage
              key={`poll_item_${i}`}
              senderId={senderId}
              senderName={senderName}
              pollData={pollData}
              timestamp={timestamp}
            />
          );
        })}
      </div>
    </div>
  ) : (
    <div className="p-4 text-center text-gray-400">
      <p>No polls yet</p>
    </div>
  );
};

export function PollPanel({ panelHeight }) {
  const inputHeight = 200;
  const listHeight = panelHeight - inputHeight;

  return (
    <div>
      <PollMessages listHeight={listHeight} />
      <PollInput inputHeight={inputHeight} />
    </div>
  );
}
