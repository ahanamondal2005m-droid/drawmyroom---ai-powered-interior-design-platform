import React, { useRef, useState, useEffect } from 'react';
import { PlacedObject, RoomDimensions } from '../../types';
import { AlertTriangle, Check, Lock, Unlock, Grid, Move, RotateCw, Trash2, Eye } from 'lucide-react';
import { computeClearanceConflicts } from '../../../local-engine/clearance';

interface Room2DCanvasProps {
  dimensions: RoomDimensions;
  placedObjects: PlacedObject[];
  onUpdateObject: (object: PlacedObject) => void;
  /** Bulk update (multiple objects at once, e.g. full clearance recompute) */
  onUpdateObjects: (objects: PlacedObject[]) => void;
  onSelectObject: (id: string | null) => void;
  selectedObjectId?: string | null;
  egressPathInches: number;
  doorArcSwing: boolean;
  onAutoSnapClearance: (objectId: string) => void;
}

export const Room2DCanvas: React.FC<Room2DCanvasProps> = ({
  dimensions,
  placedObjects,
  onUpdateObject,
  onUpdateObjects,
  onSelectObject,
  selectedObjectId,
  egressPathInches = 36,
  doorArcSwing = true,
  onAutoSnapClearance,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(26); // pixels per foot
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Calculate pixel bounds of room
  const roomPixelWidth = dimensions.lengthFt * scale;
  const roomPixelHeight = dimensions.widthFt * scale;

  // Active clearance conflicts
  const conflictObjects = placedObjects.filter((o) => o.clearanceConflict);

  // Handle Drag Start
  const handlePointerDown = (e: React.PointerEvent, obj: PlacedObject) => {
    if (isLocked) return;
    e.stopPropagation();
    onSelectObject(obj.id);
    setDraggingId(obj.id);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseXFt = (e.clientX - rect.left) / scale;
    const mouseYFt = (e.clientY - rect.top) / scale;

    setDragOffset({
      x: mouseXFt - obj.position.x,
      y: mouseYFt - obj.position.y,
    });
  };

  // Handle Drag Move
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || isLocked || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    let newXFt = (e.clientX - rect.left) / scale - dragOffset.x;
    let newYFt = (e.clientY - rect.top) / scale - dragOffset.y;

    if (snapToGrid) {
      // Snap to 6-inch increments (0.5 ft)
      newXFt = Math.round(newXFt * 2) / 2;
      newYFt = Math.round(newYFt * 2) / 2;
    }

    // Keep object within room walls
    const activeObj = placedObjects.find((o) => o.id === draggingId);
    if (!activeObj) return;

    const halfW = (activeObj.dimensions.lengthIn / 12) / 2;
    const halfH = (activeObj.dimensions.widthIn / 12) / 2;

    newXFt = Math.max(halfW, Math.min(dimensions.lengthFt - halfW, newXFt));
    newYFt = Math.max(halfH, Math.min(dimensions.widthFt - halfH, newYFt));

    // Live clearance engine: overlaps, door swing, egress corridor, pinches
    // and blocked zones for the dragged piece (grid circulation analysis is
    // skipped mid-drag for snappiness and runs when the drag settles below).
    const next = placedObjects.map((o) =>
      o.id === draggingId ? { ...o, position: { x: newXFt, y: newYFt, z: 0 } } : o
    );
    const live = computeClearanceConflicts(dimensions, next, egressPathInches, { circulation: false });
    const entry = live.conflicts[draggingId];

    onUpdateObject({
      ...activeObj,
      position: { x: newXFt, y: newYFt, z: 0 },
      clearanceConflict: entry?.conflict ?? false,
      conflictMessage: entry?.message,
    });
  };

  const handlePointerUp = () => {
    setDraggingId(null);
  };

  // Full clearance recompute (incl. grid circulation analysis) whenever the
  // arrangement settles: after a drag ends, a rotation, add or delete.
  useEffect(() => {
    if (draggingId || placedObjects.length === 0) return;
    const result = computeClearanceConflicts(dimensions, placedObjects, egressPathInches, {
      circulation: true,
    });
    const needsUpdate = placedObjects.some((o) => {
      const entry = result.conflicts[o.id];
      return o.clearanceConflict !== (entry?.conflict ?? false) || o.conflictMessage !== entry?.message;
    });
    if (needsUpdate) {
      onUpdateObjects(
        placedObjects.map((o) => {
          const entry = result.conflicts[o.id];
          return { ...o, clearanceConflict: entry?.conflict ?? false, conflictMessage: entry?.message };
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placedObjects, dimensions, egressPathInches, draggingId]);

  const handleRotate = (e: React.MouseEvent, obj: PlacedObject) => {
    e.stopPropagation();
    const nextRotation = (obj.rotation + 45) % 360;
    onUpdateObject({
      ...obj,
      rotation: nextRotation,
    });
  };

  return (
    <div
      className="relative w-full h-full min-h-[520px] bg-[#0E1116] flex flex-col rounded-xl border border-[#28303F] overflow-hidden select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* 2D Canvas Top Controls Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#181C24] border-b border-[#28303F] z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#06B6D4]"></span>
            <span className="font-semibold text-white">ORTHOGRAPHIC 2D</span>
            <span className="text-slate-500">•</span>
            <span>GRID: 12" × 12" SNAP</span>
            <span className="text-slate-500">•</span>
            <span>SCALE 1:50</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            title="Toggle Snap Grid"
            className={`p-1.5 rounded text-xs flex items-center gap-1.5 transition-colors ${
              snapToGrid ? 'bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px]">SNAP</span>
          </button>

          <button
            onClick={() => setIsLocked(!isLocked)}
            title={isLocked ? 'Unlock Canvas' : 'Lock Canvas'}
            className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
              isLocked ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Clearance Conflict Alert Banner */}
      {conflictObjects.length > 0 && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-950/80 border border-red-500/50 rounded-lg flex items-center justify-between z-10 animate-fade-in shadow-lg">
          <div className="flex items-center gap-2 text-xs text-red-200">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <div>
              <span className="font-bold text-red-100">Clearance Alert Detected:</span>{' '}
              {conflictObjects[0].conflictMessage || 'Furniture placement restricts required 36" egress passage.'}
            </div>
          </div>

          <button
            onClick={() => onAutoSnapClearance(conflictObjects[0].id)}
            className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-medium rounded transition-colors whitespace-nowrap shadow"
          >
            Auto-Snap Clearance ({egressPathInches}")
          </button>
        </div>
      )}

      {/* Canvas Workspace Center */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[#0F1217]">
        <div
          ref={containerRef}
          style={{
            width: `${roomPixelWidth}px`,
            height: `${roomPixelHeight}px`,
          }}
          className="relative bg-[#14171D] border-2 border-[#06B6D4]/70 shadow-2xl transition-all duration-200"
          onClick={() => onSelectObject(null)}
        >
          {/* Architectural Background Grid */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `linear-gradient(to right, #2A313E 1px, transparent 1px), linear-gradient(to bottom, #2A313E 1px, transparent 1px)`,
              backgroundSize: `${scale}px ${scale}px`,
            }}
          />

          {/* Top Dimension Callout (X-Axis: e.g. 18' - 0" (5,486 mm)) */}
          <div className="absolute -top-7 left-0 right-0 flex items-center justify-between text-[11px] font-mono text-[#06B6D4] px-1 pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-[#06B6D4]"></span>
            <div className="flex-1 mx-2 border-b border-[#06B6D4]/60 relative flex items-center justify-center">
              <span className="bg-[#0E1116] px-2 py-0.5 text-[#06B6D4] font-semibold">
                {dimensions.lengthFt}' - 0" ({(dimensions.lengthFt * 304.8).toFixed(0)} mm)
              </span>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#06B6D4]"></span>
          </div>

          {/* Left Dimension Callout (Y-Axis: e.g. 14' - 0") */}
          <div className="absolute top-0 bottom-0 -left-7 flex flex-col items-center justify-between text-[11px] font-mono text-[#06B6D4] py-1 pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-[#06B6D4]"></span>
            <div className="flex-1 my-2 border-l border-[#06B6D4]/60 relative flex items-center justify-center">
              <span className="bg-[#0E1116] px-0.5 py-1 text-[#06B6D4] font-semibold [writing-mode:vertical-rl] rotate-180">
                {dimensions.widthFt}' - 0"
              </span>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#06B6D4]"></span>
          </div>

          {/* 36-inch Egress Corridor Guideline Overlay */}
          <div
            className="absolute pointer-events-none border border-dashed border-[#06B6D4]/40 bg-[#06B6D4]/5 rounded-sm flex items-center justify-center text-[10px] font-mono text-[#06B6D4]/70"
            style={{
              left: `${scale * 1.5}px`,
              top: `${scale * 1}px`,
              bottom: `${scale * 1}px`,
              width: `${(egressPathInches / 12) * scale}px`,
            }}
          >
            <span className="[writing-mode:vertical-rl] tracking-wider uppercase">
              EGRESS CORRIDOR {egressPathInches}"
            </span>
          </div>

          {/* Door Arc Swing Indicator (bottom-right door) */}
          {doorArcSwing && (
            <div
              className="absolute bottom-0 right-4 pointer-events-none"
              style={{
                width: `${scale * 3}px`,
                height: `${scale * 3}px`,
              }}
            >
              <svg className="w-full h-full overflow-visible">
                <path
                  d={`M 0 ${scale * 3} A ${scale * 3} ${scale * 3} 0 0 1 ${scale * 3} 0`}
                  fill="none"
                  stroke="#E5855E"
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                />
                <line
                  x1="0"
                  y1={scale * 3}
                  x2={scale * 3}
                  y2={scale * 3}
                  stroke="#E5855E"
                  strokeWidth="2"
                />
                <text x="10" y={scale * 2.8} fill="#E5855E" fontSize="9" fontFamily="monospace">
                  36" SWING
                </text>
              </svg>
            </div>
          )}

          {/* Window Fenestration Profile on North Wall (Top Wall) */}
          <div
            className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 bg-[#06B6D4] rounded-sm flex items-center justify-center px-4 shadow-sm"
            style={{ width: `${Math.min(dimensions.lengthFt * 0.6, 10) * scale}px` }}
          >
            <span className="text-[9px] font-mono text-black font-bold uppercase tracking-wider">
              10' FENESTRATION BAY
            </span>
          </div>

          {/* Placed Furniture Elements */}
          {placedObjects.map((obj) => {
            if (obj.visible === false) return null;

            const isSelected = selectedObjectId === obj.id;
            const hasConflict = obj.clearanceConflict;

            // Convert inches to pixels
            const widthPx = (obj.dimensions.lengthIn / 12) * scale;
            const heightPx = (obj.dimensions.widthIn / 12) * scale;
            const leftPx = obj.position.x * scale - widthPx / 2;
            const topPx = obj.position.y * scale - heightPx / 2;

            return (
              <div
                key={obj.id}
                onPointerDown={(e) => handlePointerDown(e, obj)}
                style={{
                  width: `${widthPx}px`,
                  height: `${heightPx}px`,
                  transform: `translate(${leftPx}px, ${topPx}px) rotate(${obj.rotation}deg)`,
                  transformOrigin: 'center center',
                }}
                className={`absolute cursor-move transition-shadow rounded ${
                  isSelected
                    ? 'ring-2 ring-[#E5855E] bg-[#E5855E]/30 z-30 shadow-xl'
                    : hasConflict
                    ? 'ring-2 ring-red-500 bg-red-900/40 z-20'
                    : 'bg-[#242A36]/80 hover:bg-[#2A313E] border border-[#3B4559] z-10'
                }`}
              >
                {/* Object Content */}
                <div className="w-full h-full flex flex-col items-center justify-center p-1 overflow-hidden pointer-events-none text-center">
                  <span
                    className={`font-mono text-[9px] font-bold uppercase tracking-tight truncate max-w-full ${
                      isSelected
                        ? 'text-[#E5855E]'
                        : hasConflict
                        ? 'text-red-300'
                        : 'text-slate-200'
                    }`}
                  >
                    {obj.name}
                  </span>
                  <span className="font-mono text-[8px] text-slate-400">
                    {obj.dimensions.lengthIn}" × {obj.dimensions.widthIn}"
                  </span>
                  {isSelected && (
                    <span className="mt-0.5 px-1 bg-[#E5855E] text-black text-[7px] font-bold rounded">
                      ACTIVE
                    </span>
                  )}
                </div>

                {/* Object Quick Actions (Rotate handle on hover/select) */}
                {isSelected && (
                  <div
                    onClick={(e) => handleRotate(e, obj)}
                    title="Rotate 45°"
                    className="absolute -top-3 -right-3 w-6 h-6 bg-[#E5855E] text-black rounded-full flex items-center justify-center shadow-md cursor-pointer hover:scale-110 pointer-events-auto transition-transform"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2D Canvas Bottom Status Hint */}
      <div className="px-4 py-2 bg-[#181C24] border-t border-[#28303F] flex items-center justify-between text-xs font-mono text-slate-400">
        <div>
          Select object to drag • Click rotation handle to turn 45° • 36" clearance enforced
        </div>
        <div className="text-[#06B6D4]">
          USABLE AREA: {(dimensions.lengthFt * dimensions.widthFt).toFixed(0)} SQ FT
        </div>
      </div>
    </div>
  );
};
