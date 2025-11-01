import React, { useMemo, useState } from "react";
import { useMeeting } from "@videosdk.live/react-sdk";
import { MemoizedParticipantGrid } from "../../components/ParticipantGrid";

function ParticipantsViewer({ isPresenting }) {
  const {
    participants,
    pinnedParticipants,
    activeSpeakerId,
    localParticipant,
    localScreenShareOn,
    presenterId,
  } = useMeeting();

  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = isPresenting ? 6 : 25; // 5x5 grid when not presenting

  const orderedIds = useMemo(() => {
    const pinnedParticipantId = [...pinnedParticipants.keys()].filter(
      (participantId) => {
        return participantId !== localParticipant.id;
      }
    );
    const regularParticipantIds = [...participants.keys()].filter(
      (participantId) => {
        return (
          ![...pinnedParticipants.keys()].includes(participantId) &&
          localParticipant.id !== participantId
        );
      }
    );

    const ids = [
      localParticipant.id,
      ...pinnedParticipantId,
      ...regularParticipantIds,
    ];

    if (activeSpeakerId) {
      if (!ids.includes(activeSpeakerId)) {
        ids[ids.length - 1] = activeSpeakerId;
      }
    }
    return ids;
  }, [
    participants,
    activeSpeakerId,
    pinnedParticipants,
    presenterId,
    localScreenShareOn,
  ]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(orderedIds.length / pageSize)), [orderedIds.length, pageSize]);
  const clampedPage = Math.min(currentPage, totalPages - 1);
  const participantIds = useMemo(() => {
    const start = clampedPage * pageSize;
    const end = start + pageSize;
    return orderedIds.slice(start, end);
  }, [orderedIds, clampedPage, pageSize]);

  return (
    <div className="flex flex-col w-full h-full">
      <MemoizedParticipantGrid
        participantIds={participantIds}
        isPresenting={isPresenting}
        pageSize={pageSize}
      />
      {!isPresenting && totalPages > 1 ? (
        <div className="flex items-center justify-center py-2 gap-2">
          <button
            className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50"
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={clampedPage === 0}
          >
            Prev
          </button>
          <span className="text-white text-sm">
            {clampedPage + 1} / {totalPages}
          </span>
          <button
            className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50"
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={clampedPage >= totalPages - 1}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}

const MemorizedParticipantView = React.memo(
  ParticipantsViewer,
  (prevProps, nextProps) => {
    return prevProps.isPresenting === nextProps.isPresenting;
  }
);

export default MemorizedParticipantView;
