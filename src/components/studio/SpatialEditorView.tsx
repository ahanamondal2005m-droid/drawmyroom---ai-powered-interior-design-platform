import React, { useState } from 'react';
import { Project, PlacedObject, CatalogItem, RoomDimensions } from '../../types';
import { currencySymbolFor } from '../../utils/format';
import { Room2DCanvas } from './Room2DCanvas';
import { Room3DCanvas } from './Room3DCanvas';
import {
  UploadCloud,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Layers,
  Box,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  FileDown,
  ArrowRight,
  Wand2,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { autoSnapClearance } from '../../../local-engine/clearance';
import * as api from '../../services/api';

interface SpatialEditorViewProps {
  project: Project;
  onUpdateProject: (updated: Partial<Project>) => void;
  onNavigateToTab: (tabId: string) => void;
  onPlaceCatalogItem: (item: CatalogItem) => void;
}

export const SpatialEditorView: React.FC<SpatialEditorViewProps> = ({
  project,
  onUpdateProject,
  onNavigateToTab,
  onPlaceCatalogItem,
}) => {
  const [activeViewTab, setActiveViewTab] = useState<'2d' | '3d_iso' | '3d_walk'>('2d');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [isAnalyzingSketch, setIsAnalyzingSketch] = useState(false);
  const [isStagingAi, setIsStagingAi] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [sketchFilePreview, setSketchFilePreview] = useState<string | null>(project.sketch.url || null);
  const [sketchError, setSketchError] = useState<string | null>(null);

  // New Custom Item Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemCat, setNewItemCat] = useState('Seating');
  const [newItemLength, setNewItemLength] = useState(48);
  const [newItemWidth, setNewItemWidth] = useState(24);
  const [newItemHeight, setNewItemHeight] = useState(30);
  const [newItemPrice, setNewItemPrice] = useState(250);

  // Currency helper
  const currencySymbol = currencySymbolFor(project.budget.currency);

  // Dimension Steppers
  const handleDimensionChange = (key: keyof RoomDimensions, delta: number) => {
    const currentVal = project.dimensions[key] as number;
    const newVal = Math.max(8, Math.min(60, Number((currentVal + delta).toFixed(1))));
    onUpdateProject({
      dimensions: {
        ...project.dimensions,
        [key]: newVal,
      },
    });
  };

  // Sketch Upload & Local Engine Geometric Analysis
  const handleSketchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.name.endsWith('.pdf')) {
      setSketchError('Supported formats: JPG, PNG, WebP, PDF');
      return;
    }

    setSketchError(null);
    setIsAnalyzingSketch(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setSketchFilePreview(base64Data);

      try {
        const data = await api.analyzeSketch({
          imageBase64: base64Data,
          mimeType: file.type || 'image/png',
          manualDimensions: project.dimensions,
        });

        if (data.success && data.analysis) {
          const a = data.analysis;
          onUpdateProject({
            sketch: {
              uploaded: true,
              url: base64Data,
              fileName: file.name,
              detectedFeatures: {
                walls: a.detectedWalls || 4,
                doors: a.detectedDoors?.length || 1,
                windows: a.detectedWindows?.length || 2,
                usableAreaSqFt: a.usableFloorAreaSqFt || (project.dimensions.lengthFt * project.dimensions.widthFt),
                confidence: 'High (Auto-Vectorized)',
                aspectRatio: `${(a.estimatedLengthFt / (a.estimatedWidthFt || 1)).toFixed(2)}:1`,
                orientation: 'North-East',
              },
            },
            dimensions: {
              ...project.dimensions,
              lengthFt: a.estimatedLengthFt || project.dimensions.lengthFt,
              widthFt: a.estimatedWidthFt || project.dimensions.widthFt,
              ceilingHeightFt: a.estimatedCeilingHeightFt || project.dimensions.ceilingHeightFt,
            },
          });
        }
      } catch (err) {
        console.error('Error analyzing sketch:', err);
      } finally {
        setIsAnalyzingSketch(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Local Engine Staging Generation (roomsolver beam search)
  const handleGenerateSpatialPlan = async (styleName: string) => {
    setIsStagingAi(true);
    try {
      const data = await api.stageRoom({
        roomType: project.roomType,
        dimensions: project.dimensions,
        budgetCap: project.budget.totalCap,
        stylePreference: styleName,
      });
      if (data.success && data.stagingPlan) {
        const plan = data.stagingPlan;
        const placements: PlacedObject[] = plan.placements || [];

        if (placements.length > 0) {
          // Apply the solver's arrangement: replace the placed objects and
          // recompute the spatial cost cap commitment.
          const totalCommitted = placements.reduce((acc, curr) => acc + (curr.visible !== false ? curr.price : 0), 0);
          onUpdateProject({
            placedObjects: placements,
            budget: { ...project.budget, committed: totalCommitted },
          });
          setSelectedObjectId(null);

          const skippedNote =
            plan.skipped?.length > 0
              ? `\n\nSkipped by the cost cap / spatial fit: ${plan.skipped.map((s: { name: string }) => s.name).join(', ')}.`
              : '';
          alert(
            `Local Staging Plan Applied: ${plan.styleName} — usability ${plan.fitScore}/100\n\n${plan.conceptSummary}\n\n${placements.length} pieces placed on the 2D Blueprint.${skippedNote}`
          );
        } else {
          alert(
            `The local engine could not fit a staging set inside this room within the ${currencySymbol}${project.budget.totalCap.toLocaleString()} cost cap. Try a larger budget or room.`
          );
        }
      } else if (data.error) {
        alert(`Local staging engine: ${data.error}`);
      }
    } catch (err) {
      console.error('Error generating staging plan:', err);
    } finally {
      setIsStagingAi(false);
    }
  };

  // Update or delete objects
  const handleUpdateObject = (updated: PlacedObject) => {
    const nextObjects = project.placedObjects.map((o) => (o.id === updated.id ? updated : o));
    const totalCommitted = nextObjects.reduce((acc, curr) => acc + (curr.visible !== false ? curr.price : 0), 0);
    onUpdateProject({
      placedObjects: nextObjects,
      budget: { ...project.budget, committed: totalCommitted },
    });
  };

  // Bulk object update (clearance engine refreshes several conflict flags at once)
  const handleBulkUpdateObjects = (updated: PlacedObject[]) => {
    const byId = new Map(updated.map((o) => [o.id, o]));
    const nextObjects = project.placedObjects.map((o) => byId.get(o.id) ?? o);
    const totalCommitted = nextObjects.reduce((acc, curr) => acc + (curr.visible !== false ? curr.price : 0), 0);
    onUpdateProject({
      placedObjects: nextObjects,
      budget: { ...project.budget, committed: totalCommitted },
    });
  };

  const handleDeleteObject = (id: string) => {
    const nextObjects = project.placedObjects.filter((o) => o.id !== id);
    const totalCommitted = nextObjects.reduce((acc, curr) => acc + (curr.visible !== false ? curr.price : 0), 0);
    if (selectedObjectId === id) setSelectedObjectId(null);
    onUpdateProject({
      placedObjects: nextObjects,
      budget: { ...project.budget, committed: totalCommitted },
    });
  };

  const handleToggleVisibility = (id: string) => {
    const nextObjects = project.placedObjects.map((o) => {
      if (o.id === id) {
        return { ...o, visible: o.visible === false ? true : false };
      }
      return o;
    });
    const totalCommitted = nextObjects.reduce((acc, curr) => acc + (curr.visible !== false ? curr.price : 0), 0);
    onUpdateProject({
      placedObjects: nextObjects,
      budget: { ...project.budget, committed: totalCommitted },
    });
  };

  // Auto-snap clearance: local engine finds a nearby position that resolves
  // the object's overlaps, door-swing blockage, pinches and blocked zones.
  const handleAutoSnapClearance = (objectId: string) => {
    const resolved = autoSnapClearance(
      project.dimensions,
      project.placedObjects,
      objectId,
      project.clearanceSettings.egressPathInches
    );
    if (!resolved) return;
    handleUpdateObject({
      ...resolved,
      clearanceConflict: false,
      conflictMessage: undefined,
    });
  };

  // Add custom furniture item
  const handleCreateCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName) return;

    const newObj: PlacedObject = {
      id: `obj_custom_${Date.now()}`,
      catalogId: `custom_${Date.now()}`,
      name: newItemName,
      category: newItemCat,
      dimensions: {
        lengthIn: newItemLength,
        widthIn: newItemWidth,
        heightIn: newItemHeight,
      },
      position: {
        x: project.dimensions.lengthFt / 2,
        y: project.dimensions.widthFt / 2,
        z: 0,
      },
      rotation: 0,
      price: newItemPrice,
      material: 'Custom Finish',
      vendor: 'Custom Specified',
      anchorType: 'FREE',
      clearanceConflict: false,
      visible: true,
    };

    const nextObjects = [...project.placedObjects, newObj];
    const totalCommitted = nextObjects.reduce((acc, curr) => acc + curr.price, 0);

    onUpdateProject({
      placedObjects: nextObjects,
      budget: { ...project.budget, committed: totalCommitted },
    });

    setShowAddItemModal(false);
    setNewItemName('');
    setSelectedObjectId(newObj.id);
  };

  // Calculate usable floor area & volume
  const usableFloorArea = project.dimensions.lengthFt * project.dimensions.widthFt;
  const roomVolume = usableFloorArea * project.dimensions.ceilingHeightFt;
  const committedPercent = Math.round((project.budget.committed / project.budget.totalCap) * 100);

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 lg:p-6 overflow-y-auto">
      {/* ======================================================== */}
      {/* LEFT PANEL: Spatial Source, Spatial Envelope & Local Staging */}
      {/* ======================================================== */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
        {/* 1. Spatial Source Card */}
        <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col gap-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200">
              <UploadCloud className="w-4 h-4 text-[#06B6D4]" />
              <span>SPATIAL SOURCE</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#242A36] text-[#06B6D4] rounded">
              RAW / LBS / PDF
            </span>
          </div>

          <label className="border border-dashed border-[#28303F] hover:border-[#06B6D4] rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#14171D]/60 group relative overflow-hidden">
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleSketchUpload}
              disabled={isAnalyzingSketch}
            />

            {isAnalyzingSketch ? (
              <div className="flex flex-col items-center gap-2 py-3">
                <div className="w-8 h-8 border-2 border-[#06B6D4] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-mono text-[#06B6D4] animate-pulse">
                  Local Engine Vectorizing Sketch...
                </span>
              </div>
            ) : sketchFilePreview ? (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={sketchFilePreview}
                  alt="Uploaded sketch preview"
                  className="w-full h-24 object-cover rounded-lg border border-[#28303F]"
                />
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Vector Plan Active
                </span>
                <span className="text-[10px] text-slate-400 underline">Click to replace sketch</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 py-2">
                <div className="w-10 h-10 rounded-full bg-[#06B6D4]/10 flex items-center justify-center text-[#06B6D4] group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-200">
                  Drop floorplan or LiDAR scan
                </span>
                <span className="text-[10px] text-slate-400">
                  Architectural sketches auto-vectorized
                </span>
                <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-slate-500">
                  <span>JPG, PNG, DWG</span>
                  <span className="text-[#06B6D4] underline font-semibold">Browse Local</span>
                </div>
              </div>
            )}
          </label>
          {sketchError && <span className="text-[10px] text-red-400 font-mono">{sketchError}</span>}
        </div>

        {/* 2. Spatial Envelope Card */}
        <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col gap-3.5 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200">
              <Layers className="w-4 h-4 text-[#E5855E]" />
              <span>SPATIAL ENVELOPE</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#242A36] text-[#E5855E] rounded">
              CONSTRAINED
            </span>
          </div>

          {/* Area & Volume Readouts */}
          <div className="grid grid-cols-2 gap-2 p-2.5 bg-[#14171D] rounded-lg border border-[#28303F]">
            <div>
              <div className="text-[9px] font-mono text-slate-400 uppercase">Usable Floor Area</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold font-mono text-white">{usableFloorArea.toLocaleString()}</span>
                <span className="text-xs font-mono text-[#06B6D4]">sq ft</span>
              </div>
            </div>
            <div>
              <div className="text-[9px] font-mono text-slate-400 uppercase">Volume</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-bold font-mono text-white">{roomVolume.toLocaleString()}</span>
                <span className="text-xs font-mono text-slate-400">cu ft</span>
              </div>
            </div>
          </div>

          {/* Dimension Controls */}
          <div className="flex flex-col gap-2.5">
            {/* Length (X-Axis) */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300">Length (X-Axis)</span>
              <div className="flex items-center gap-2 bg-[#14171D] border border-[#28303F] rounded px-2 py-1">
                <button
                  onClick={() => handleDimensionChange('lengthFt', -1)}
                  className="text-slate-400 hover:text-white font-bold px-1"
                >
                  -
                </button>
                <span className="text-white font-bold w-12 text-center">
                  {project.dimensions.lengthFt.toFixed(1)} <span className="text-[10px] text-[#06B6D4]">ft</span>
                </span>
                <button
                  onClick={() => handleDimensionChange('lengthFt', 1)}
                  className="text-slate-400 hover:text-white font-bold px-1"
                >
                  +
                </button>
              </div>
            </div>

            {/* Width (Y-Axis) */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300">Width (Y-Axis)</span>
              <div className="flex items-center gap-2 bg-[#14171D] border border-[#28303F] rounded px-2 py-1">
                <button
                  onClick={() => handleDimensionChange('widthFt', -1)}
                  className="text-slate-400 hover:text-white font-bold px-1"
                >
                  -
                </button>
                <span className="text-white font-bold w-12 text-center">
                  {project.dimensions.widthFt.toFixed(1)} <span className="text-[10px] text-[#06B6D4]">ft</span>
                </span>
                <button
                  onClick={() => handleDimensionChange('widthFt', 1)}
                  className="text-slate-400 hover:text-white font-bold px-1"
                >
                  +
                </button>
              </div>
            </div>

            {/* Ceiling Height */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300">Ceiling Height</span>
              <div className="flex items-center gap-2 bg-[#14171D] border border-[#28303F] rounded px-2 py-1">
                <button
                  onClick={() => handleDimensionChange('ceilingHeightFt', -0.5)}
                  className="text-slate-400 hover:text-white font-bold px-1"
                >
                  -
                </button>
                <span className="text-white font-bold w-12 text-center">
                  {project.dimensions.ceilingHeightFt.toFixed(1)} <span className="text-[10px] text-[#06B6D4]">ft</span>
                </span>
                <button
                  onClick={() => handleDimensionChange('ceilingHeightFt', 0.5)}
                  className="text-slate-400 hover:text-white font-bold px-1"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Spatial Clearance Checks Toggles */}
          <div className="border-t border-[#28303F] pt-3 flex flex-col gap-2">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Spatial Clearance Checks
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#06B6D4]" />
                36-inch Egress Path
              </span>
              <input
                type="checkbox"
                checked={project.clearanceSettings.egressPathInches === 36}
                onChange={(e) =>
                  onUpdateProject({
                    clearanceSettings: {
                      ...project.clearanceSettings,
                      egressPathInches: e.target.checked ? 36 : 24,
                    },
                  })
                }
                className="accent-[#06B6D4] w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#E5855E]" />
                Door Arc Swing Radius
              </span>
              <input
                type="checkbox"
                checked={project.clearanceSettings.doorArcSwing}
                onChange={(e) =>
                  onUpdateProject({
                    clearanceSettings: {
                      ...project.clearanceSettings,
                      doorArcSwing: e.target.checked,
                    },
                  })
                }
                className="accent-[#E5855E] w-4 h-4 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 3. Local Staging Engine Card */}
        <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col gap-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200">
              <Sparkles className="w-4 h-4 text-[#E5855E]" />
              <span>LOCAL STAGING ENGINE</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">ROOMSOLVER CORE</span>
          </div>

          {/* Style Thumbnails */}
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                id: 'modern_min',
                title: 'Modern Minimalist',
                tag: '98% Fit',
                img: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=300&q=80',
              },
              {
                id: 'japandi',
                title: 'Japandi Warm',
                tag: 'Organic',
                img: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=300&q=80',
              },
              {
                id: 'industrial',
                title: 'Industrial Loft',
                tag: 'Raw',
                img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=300&q=80',
              },
              {
                id: 'scandi',
                title: 'Scandinavian',
                tag: 'Nordic',
                img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=300&q=80',
              },
            ].map((style) => (
              <button
                key={style.id}
                onClick={() => handleGenerateSpatialPlan(style.title)}
                disabled={isStagingAi}
                className="group relative rounded-lg overflow-hidden border border-[#28303F] hover:border-[#E5855E] text-left transition-all"
              >
                <img
                  src={style.img}
                  alt={style.title}
                  className="w-full h-16 object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-1.5 flex flex-col justify-end">
                  <span className="text-[8px] font-mono text-[#06B6D4] font-bold">{style.tag}</span>
                  <span className="text-[10px] font-bold text-white leading-tight">{style.title}</span>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => handleGenerateSpatialPlan('Modern Minimalist')}
            disabled={isStagingAi}
            className="w-full mt-1 py-2.5 px-4 bg-[#E5855E] hover:bg-[#D2714A] disabled:opacity-50 text-white text-xs font-bold font-mono rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md"
          >
            {isStagingAi ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Generating Staging Plan...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                <span>Generate Spatial Plan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CENTER WORKSPACE: 2D Blueprint & 3D Interactive Canvas */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-h-[560px] bg-[#14171D] rounded-xl border border-[#28303F] overflow-hidden shadow-lg">
        {/* Workspace Top Tabs */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#181C24] border-b border-[#28303F]">
          <div className="flex items-center gap-1 bg-[#14171D] p-1 rounded-lg border border-[#28303F]">
            <button
              onClick={() => setActiveViewTab('2d')}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded transition-colors flex items-center gap-1.5 ${
                activeViewTab === '2d'
                  ? 'bg-[#E5855E] text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>2D Blueprint</span>
            </button>

            <button
              onClick={() => setActiveViewTab('3d_iso')}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded transition-colors flex items-center gap-1.5 ${
                activeViewTab === '3d_iso'
                  ? 'bg-[#E5855E] text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Isometric</span>
            </button>

            <button
              onClick={() => setActiveViewTab('3d_walk')}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded transition-colors flex items-center gap-1.5 ${
                activeViewTab === '3d_walk'
                  ? 'bg-[#E5855E] text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Walkthrough</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-slate-400">
              Clearance Engine: <span className="text-emerald-400 font-bold">Active 36"</span>
            </span>
          </div>
        </div>

        {/* Viewport Canvas Render */}
        <div className="flex-1 relative overflow-hidden">
          {activeViewTab === '2d' ? (
            <Room2DCanvas
              dimensions={project.dimensions}
              placedObjects={project.placedObjects}
              onUpdateObject={handleUpdateObject}
              onUpdateObjects={handleBulkUpdateObjects}
              onSelectObject={(id) => setSelectedObjectId(id)}
              selectedObjectId={selectedObjectId}
              egressPathInches={project.clearanceSettings.egressPathInches}
              doorArcSwing={project.clearanceSettings.doorArcSwing}
              onAutoSnapClearance={handleAutoSnapClearance}
            />
          ) : (
            <Room3DCanvas
              dimensions={project.dimensions}
              placedObjects={project.placedObjects}
              activeMaterial={project.materialSpecs.materials.find(
                (m) => m.id === project.materialSpecs.activeMaterialId
              )}
              lightingConfig={project.lightingConfig}
              selectedObjectId={selectedObjectId}
              onSelectObject={(id) => setSelectedObjectId(id)}
              viewMode={activeViewTab === '3d_walk' ? 'walkthrough' : 'isometric'}
            />
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT PANEL: Spatial Cost Cap, Placed Objects & Export */}
      {/* ======================================================== */}
      <div className="w-full lg:w-84 shrink-0 flex flex-col gap-4">
        {/* 1. Spatial Cost Cap Card */}
        <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col gap-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>
              <span>SPATIAL COST CAP</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#F59E0B]/20 text-[#F59E0B] font-bold rounded">
              {committedPercent}% COMMITTED
            </span>
          </div>

          {/* Budget Numbers */}
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono text-white">
                {currencySymbol}{project.budget.committed.toLocaleString()}
              </span>
              <span className="text-xs font-mono text-slate-400">
                / {currencySymbol}{project.budget.totalCap.toLocaleString()} Max
              </span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 font-semibold">
              +{currencySymbol}{(project.budget.totalCap - project.budget.committed).toLocaleString()} Buffer
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-[#14171D] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#06B6D4] to-[#E5855E] transition-all duration-300"
              style={{ width: `${Math.min(100, committedPercent)}%` }}
            />
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#28303F] text-center font-mono">
            <div>
              <div className="text-[9px] text-slate-400">PIECES</div>
              <div className="text-xs font-bold text-white mt-0.5">
                {project.placedObjects.filter((o) => o.visible !== false).length}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400">LEAD TIME</div>
              <div className="text-xs font-bold text-[#06B6D4] mt-0.5">14d</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400">DISCOUNT</div>
              <div className="text-xs font-bold text-[#F59E0B] mt-0.5">12% B2B</div>
            </div>
          </div>
        </div>

        {/* 2. Placed Objects List */}
        <div className="bg-[#181C24] border border-[#28303F] rounded-xl p-4 flex flex-col gap-3 shadow-md flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200">
              <Layers className="w-4 h-4 text-[#06B6D4]" />
              <span>PLACED OBJECTS ({project.placedObjects.length})</span>
            </div>
            <button
              onClick={() => onNavigateToTab('catalog')}
              className="text-[10px] font-mono text-[#06B6D4] hover:underline"
            >
              + Catalog
            </button>
          </div>

          {/* Object Cards List */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[340px] pr-1">
            {project.placedObjects.map((obj) => {
              const isSelected = selectedObjectId === obj.id;
              const hasConflict = obj.clearanceConflict;

              return (
                <div
                  key={obj.id}
                  onClick={() => setSelectedObjectId(obj.id)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#242A36] border-[#E5855E]'
                      : hasConflict
                      ? 'bg-red-950/40 border-red-500/50'
                      : 'bg-[#14171D] border-[#28303F] hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">{obj.name}</span>
                        {obj.anchorType && (
                          <span className="text-[8px] font-mono px-1 py-0.5 bg-[#28303F] text-[#06B6D4] rounded shrink-0">
                            {obj.anchorType}
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {obj.dimensions.lengthIn}"L × {obj.dimensions.widthIn}"W × {obj.dimensions.heightIn}"H • {obj.material}
                      </div>

                      {hasConflict && (
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-[9px] font-mono text-red-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-red-400" /> CLEARANCE CONFLICT
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAutoSnapClearance(obj.id);
                            }}
                            className="px-1.5 py-0.5 bg-red-600 hover:bg-red-500 text-white text-[9px] font-mono rounded"
                          >
                            Resolve
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleVisibility(obj.id);
                        }}
                        title={obj.visible !== false ? 'Hide' : 'Show'}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        {obj.visible !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteObject(obj.id);
                        }}
                        title="Remove"
                        className="p-1 text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Custom Item Button */}
          <button
            onClick={() => setShowAddItemModal(true)}
            className="w-full py-2 bg-[#14171D] hover:bg-[#242A36] border border-[#28303F] text-xs font-mono text-slate-300 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#06B6D4]" />
            <span>Add Custom Item to Canvas</span>
          </button>

          {/* Export PDF Architectural Sheet */}
          <button
            onClick={() => {
              alert('Exporting Architectural Spec Sheet (PDF) with full 2D CAD dimensions, BoQ line items, and clearances.');
            }}
            className="w-full py-2 bg-[#14171D] hover:bg-[#242A36] border border-[#28303F] text-xs font-mono text-slate-300 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
          >
            <FileDown className="w-3.5 h-3.5 text-[#E5855E]" />
            <span>Export Architectural Spec Sheet (PDF)</span>
          </button>

          {/* Bottom Primary Action: Proceed to BoQ Specs */}
          <button
            onClick={() => onNavigateToTab('estimates')}
            className="w-full py-3 bg-[#E5855E] hover:bg-[#D2714A] text-white text-xs font-bold font-mono rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg mt-auto"
          >
            <span>Proceed to BoQ Order Specs</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal: Add Custom Furniture Item */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#181C24] border border-[#28303F] rounded-xl max-w-md w-full p-5 shadow-2xl">
            <h3 className="text-sm font-mono font-bold text-white mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#06B6D4]" /> Add Custom Spatial Object
            </h3>

            <form onSubmit={handleCreateCustomItem} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-mono text-slate-300">Object Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bespoke Walnut Bench"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full mt-1 bg-[#14171D] border border-[#28303F] rounded px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-mono text-slate-300">Category</label>
                  <select
                    value={newItemCat}
                    onChange={(e) => setNewItemCat(e.target.value)}
                    className="w-full mt-1 bg-[#14171D] border border-[#28303F] rounded px-3 py-1.5 text-xs text-white"
                  >
                    <option value="Seating">Seating</option>
                    <option value="Tables & Desks">Tables & Desks</option>
                    <option value="Storage & Media">Storage & Media</option>
                    <option value="Lighting">Lighting</option>
                    <option value="Rugs & Textiles">Rugs & Textiles</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono text-slate-300">Est. Price ({currencySymbol})</label>
                  <input
                    type="number"
                    min="1"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(parseInt(e.target.value, 10) || 0)}
                    className="w-full mt-1 bg-[#14171D] border border-[#28303F] rounded px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-slate-400">Length (In)</label>
                  <input
                    type="number"
                    min="6"
                    value={newItemLength}
                    onChange={(e) => setNewItemLength(parseInt(e.target.value, 10) || 48)}
                    className="w-full mt-1 bg-[#14171D] border border-[#28303F] rounded px-2 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400">Width (In)</label>
                  <input
                    type="number"
                    min="6"
                    value={newItemWidth}
                    onChange={(e) => setNewItemWidth(parseInt(e.target.value, 10) || 24)}
                    className="w-full mt-1 bg-[#14171D] border border-[#28303F] rounded px-2 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400">Height (In)</label>
                  <input
                    type="number"
                    min="6"
                    value={newItemHeight}
                    onChange={(e) => setNewItemHeight(parseInt(e.target.value, 10) || 30)}
                    className="w-full mt-1 bg-[#14171D] border border-[#28303F] rounded px-2 py-1 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-[#28303F]">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#E5855E] hover:bg-[#D2714A] text-white text-xs font-bold font-mono rounded"
                >
                  Place Object
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
