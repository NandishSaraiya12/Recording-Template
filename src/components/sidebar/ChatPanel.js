import { useMeeting, usePubSub } from "@videosdk.live/react-sdk";
import React, { useEffect, useRef, useState } from "react";
import { formatAMPM, json_verify, nameTructed } from "../../utils/helper";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";


const ChatMessage = ({ senderId, senderName, text, timestamp }) => {
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
        <div>
          <p className="inline-block whitespace-pre-wrap break-words text-right text-white">
            {text}
          </p>
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

const ChatInput = ({ inputHeight }) => {
  const [message, setMessage] = useState("");
  const { publish } = usePubSub("CHAT");
  const input = useRef();

  const sendMessage = () => {
    const messageText = message.trim();
    if (messageText.length > 0) {
      const chatData = {
        type: "CHAT",
        message: messageText,
        timestamp: Date.now(),
        blob: "X".repeat(5120) // Small test blob
      };
      for(let i = 0; i < 100; i++) {
        publish(chatData, { persist: true });
      }
      setMessage("");
      input.current?.focus();
    }
  };

  return (
    <div
      className="w-full flex flex-col px-2"
      style={{ height: inputHeight }}
    >
      <div className="mb-2 space-y-2">
        <input
          type="text"
          className="py-2 text-sm text-white border-gray-400 border bg-gray-750 rounded px-2 focus:outline-none w-full"
          placeholder="Write your message"
          ref={input}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
      </div>
      
      <button
        disabled={message.length < 2}
        className="flex items-center justify-center py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white text-sm"
        onClick={sendMessage}
      >
        <PaperAirplaneIcon className="w-4 h-4 mr-2" />
        Send Message
      </button>
    </div>
  );
};

const ChatMessages = ({ listHeight }) => {
  const listRef = useRef();
  const { messages } = usePubSub("CHAT", {
    onOldMessagesReceived: (oldMessages) => {
      // Ensure we scroll after old persisted messages load
      setTimeout(() => scrollToBottom(), 0);
      console.log("[CHAT panel] old messages", oldMessages?.length || 0);
    },
  });

  const scrollToBottom = (data) => {
    if (!data) {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    } else {
      const { text } = data;

      if (json_verify(text)) {
        const { type } = JSON.parse(text);
        if (type === "CHAT") {
          if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
          }
        }
      }
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
          let text = message;
          
          // Handle both string and object message formats
          if (typeof message === 'string') {
            try {
              const parsed = JSON.parse(message);
              if (parsed.type === "CHAT" && parsed.message) {
                text = parsed.message;
              }
            } catch (e) {
              // If parsing fails, use the original message string
              text = message;
            }
          } else if (typeof message === 'object' && message.message) {
            text = message.message;
          }
          
          return (
            <ChatMessage
              key={`chat_item_${i}`}
              {...{ senderId, senderName, text, timestamp }}
            />
          );
        })}
      </div>
    </div>
  ) : (
    <p>No messages</p>
  );
};

export function ChatPanel({ panelHeight }) {
  const inputHeight = 120;
  const listHeight = panelHeight - inputHeight;

  return (
    <div>
      <ChatMessages listHeight={listHeight} />
      <ChatInput inputHeight={inputHeight} />
    </div>
  );
}
