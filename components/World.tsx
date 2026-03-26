import React, { useRef, useState, Suspense, useEffect } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { useKeyboardControls, KeyboardControls, Environment, Text, Float, ContactShadows, Html, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { GameMode, Archetype, FurnitureType } from '../types';
import { getJoystickState } from './VirtualJoystick';
import {
    ROOM_WIDTH, ROOM_DEPTH, HALF_W, HALF_D, WALL_HEIGHT,
    FURNITURE_CATALOG, getWorldCenter, getEffectiveSize, worldToGrid, canPlace, findFurnitureAtCell,
} from '../furnitureCatalog';
import {
    PodiumModel, TeacherDeskModel, BlackboardModel, StudentDeskModel,
    DoorFrameModel, BookshelfModel, PottedPlantModel, WallClockModel,
    AreaRugModel, WindowFrame,
} from './FurnitureModels';

import { WALLPAPER_THEMES, FLOOR_THEMES } from '../shopCatalog';

function useThemeColors() {
    const { activeWallpaper, activeFloor } = useGameStore();
    const wp = WALLPAPER_THEMES.find(w => w.id === activeWallpaper) || WALLPAPER_THEMES[0];
    const fl = FLOOR_THEMES.find(f => f.id === activeFloor) || FLOOR_THEMES[0];
    return { wallColor: wp.wallColor, trimColor: wp.trimColor, floorColor: fl.floorColor, plankColor: fl.plankColor };
}

const FREDOKA_FONT = 'https://fonts.gstatic.com/s/fredoka/v9/X7wo4b8k1r6otzZk_5tF.ttf';

const AsyncText = (props: any) => (
    <Suspense fallback={null}>
        <Text {...props} />
    </Suspense>
);

// ─── Speech Bubble ──────────────────────────────────────────────────────────

const SpeechBubble = ({ text, visible }: { text?: string, visible: boolean }) => {
    if (!visible || !text) return null;
    return (
        <Html position={[0, 2.3, 0]} center distanceFactor={10} zIndexRange={[100, 0]}>
            <div className="bg-[#FFF9F0] px-4 py-3 rounded-2xl rounded-bl-none shadow-[0_4px_20px_rgba(0,0,0,0.25)] border-2 border-[#E8D5B7] w-48 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="font-brand font-bold text-[#3D1E0A] text-sm leading-tight">{text}</p>
            </div>
        </Html>
    );
};

const StatusIndicator = ({ type, onClick }: { type: 'raise_hand' | null, onClick: () => void }) => {
    if (!type) return null;
    return (
        <Html position={[0, 2.3, 0]} center distanceFactor={12} zIndexRange={[90, 0]}>
            <button
                onClick={onClick}
                className="bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_3px_12px_rgba(245,158,11,0.3)] animate-bounce border border-amber-300/50 transition-transform active:scale-90 cursor-pointer"
            >
                <span className="font-brand font-bold text-xl">?</span>
            </button>
        </Html>
    );
};

const ReactionEmoji = ({ mood, customEmoji }: { mood: string, customEmoji?: string }) => {
    if (mood === 'neutral' && !customEmoji) return null;
    let emoji = '';
    if (customEmoji) emoji = customEmoji;
    else if (mood === 'confused') emoji = '❓';
    else if (mood === 'sleeping') emoji = '💤';
    return (
        <Float speed={5} rotationIntensity={0} floatIntensity={1} position={[0.6, 2.5, 0]}>
            <AsyncText fontSize={0.6} outlineWidth={0.02} outlineColor="white">{emoji}</AsyncText>
        </Float>
    );
};

// ─── Classroom Shell ────────────────────────────────────────────────────────

const ClassroomShell = () => {
    const wallThickness = 0.15;
    const { wallColor, trimColor, floorColor, plankColor } = useThemeColors();

    const plankColors = React.useMemo(() => {
        const base = new THREE.Color(floorColor);
        return Array.from({ length: 14 }, (_, i) => {
            const c = base.clone();
            c.offsetHSL(0, 0, (Math.sin(i * 2.7) * 0.03));
            return '#' + c.getHexString();
        });
    }, [floorColor]);

    return (
        <group>
            {/* Individual wood planks with color variation */}
            {plankColors.map((col, i) => (
                <mesh key={`plank-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-HALF_W + i + 0.5, -0.01, 0]} receiveShadow>
                    <planeGeometry args={[0.96, ROOM_DEPTH]} />
                    <meshPhysicalMaterial color={col} roughness={0.55} clearcoat={0.15} clearcoatRoughness={0.6} reflectivity={0.15} />
                </mesh>
            ))}
            {/* Plank gap lines */}
            {Array.from({ length: 15 }).map((_, i) => (
                <mesh key={`gap-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-HALF_W + i, 0.001, 0]}>
                    <planeGeometry args={[0.02, ROOM_DEPTH]} />
                    <meshStandardMaterial color={plankColor} />
                </mesh>
            ))}

            {/* Ceiling */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_HEIGHT, 0]}>
                <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
                <meshStandardMaterial color="#F5F0E6" roughness={0.95} />
            </mesh>

            {/* Back wall - transparent for camera */}
            <mesh position={[0, WALL_HEIGHT / 2, HALF_D]} receiveShadow>
                <boxGeometry args={[ROOM_WIDTH + wallThickness * 2, WALL_HEIGHT, wallThickness]} />
                <meshStandardMaterial color={wallColor} roughness={0.9} transparent opacity={0.15} />
            </mesh>
            {/* Front wall */}
            <mesh position={[0, WALL_HEIGHT / 2, -HALF_D]} receiveShadow>
                <boxGeometry args={[ROOM_WIDTH + wallThickness * 2, WALL_HEIGHT, wallThickness]} />
                <meshPhysicalMaterial color={wallColor} roughness={0.85} sheen={0.1} sheenColor="#FFF8E1" />
            </mesh>
            {/* Left wall */}
            <mesh position={[-HALF_W, WALL_HEIGHT / 2, 0]} receiveShadow>
                <boxGeometry args={[wallThickness, WALL_HEIGHT, ROOM_DEPTH]} />
                <meshPhysicalMaterial color={wallColor} roughness={0.85} sheen={0.1} sheenColor="#FFF8E1" />
            </mesh>
            {/* Right wall - transparent for camera */}
            <mesh position={[HALF_W, WALL_HEIGHT / 2, 0]} receiveShadow>
                <boxGeometry args={[wallThickness, WALL_HEIGHT, ROOM_DEPTH]} />
                <meshStandardMaterial color={wallColor} roughness={0.9} transparent opacity={0.15} />
            </mesh>

            {/* Wainscoting - lower wall panels (front wall) */}
            <mesh position={[0, 0.55, -HALF_D + 0.02]}>
                <boxGeometry args={[ROOM_WIDTH - 0.3, 1.0, 0.03]} />
                <meshPhysicalMaterial color={trimColor} roughness={0.5} clearcoat={0.2} clearcoatRoughness={0.5} />
            </mesh>
            {/* Wainscoting - left wall */}
            <mesh position={[-HALF_W + 0.02, 0.55, 0]}>
                <boxGeometry args={[0.03, 1.0, ROOM_DEPTH - 0.3]} />
                <meshPhysicalMaterial color={trimColor} roughness={0.5} clearcoat={0.2} clearcoatRoughness={0.5} />
            </mesh>
            {/* Wainscoting rail */}
            <mesh position={[0, 1.08, -HALF_D + 0.04]}>
                <boxGeometry args={[ROOM_WIDTH - 0.2, 0.06, 0.06]} />
                <meshStandardMaterial color={trimColor} roughness={0.4} />
            </mesh>
            <mesh position={[-HALF_W + 0.04, 1.08, 0]}>
                <boxGeometry args={[0.06, 0.06, ROOM_DEPTH - 0.2]} />
                <meshStandardMaterial color={trimColor} roughness={0.4} />
            </mesh>

            {/* Baseboard trim */}
            <mesh position={[0, 0.1, HALF_D - 0.06]}>
                <boxGeometry args={[ROOM_WIDTH, 0.2, 0.05]} />
                <meshStandardMaterial color={trimColor} transparent opacity={0.15} />
            </mesh>
            <mesh position={[0, 0.1, -HALF_D + 0.06]}>
                <boxGeometry args={[ROOM_WIDTH, 0.2, 0.05]} />
                <meshStandardMaterial color={trimColor} roughness={0.4} />
            </mesh>
            <mesh position={[-HALF_W + 0.06, 0.1, 0]}>
                <boxGeometry args={[0.05, 0.2, ROOM_DEPTH]} />
                <meshStandardMaterial color={trimColor} roughness={0.4} />
            </mesh>
            <mesh position={[HALF_W - 0.06, 0.1, 0]}>
                <boxGeometry args={[0.05, 0.2, ROOM_DEPTH]} />
                <meshStandardMaterial color={trimColor} transparent opacity={0.15} />
            </mesh>

            {/* Crown molding */}
            <mesh position={[0, WALL_HEIGHT - 0.08, HALF_D - 0.06]}>
                <boxGeometry args={[ROOM_WIDTH, 0.12, 0.08]} />
                <meshStandardMaterial color={trimColor} transparent opacity={0.15} />
            </mesh>
            <mesh position={[0, WALL_HEIGHT - 0.08, -HALF_D + 0.06]}>
                <boxGeometry args={[ROOM_WIDTH, 0.12, 0.08]} />
                <meshStandardMaterial color={trimColor} roughness={0.4} />
            </mesh>
            <mesh position={[-HALF_W + 0.06, WALL_HEIGHT - 0.08, 0]}>
                <boxGeometry args={[0.08, 0.12, ROOM_DEPTH]} />
                <meshStandardMaterial color={trimColor} roughness={0.4} />
            </mesh>
        </group>
    );
};

// ─── Data-Driven Furniture Renderer ─────────────────────────────────────────

function getFurnitureWorldPos(gridX: number, gridZ: number, size: [number, number], rotation: 0|1|2|3, wallMounted?: boolean): [number, number, number] {
    const [cx, cz] = getWorldCenter(gridX, gridZ, size, rotation);
    if (wallMounted) {
        if (gridZ === 0) return [cx, 0, -HALF_D + 0.1];
        if (gridZ + (rotation % 2 === 0 ? size[1] : size[0]) >= ROOM_DEPTH) return [cx, 0, HALF_D - 0.1];
    }
    return [cx, 0, cz];
}

const FurnitureRenderer = ({ item, isNear }: { item: { id: string; type: FurnitureType; gridX: number; gridZ: number; rotation: 0|1|2|3 }, isNear: boolean }) => {
    const catalog = FURNITURE_CATALOG[item.type];
    const pos = getFurnitureWorldPos(item.gridX, item.gridZ, catalog.size, item.rotation, catalog.wallMounted);
    const yRot = (item.rotation * Math.PI) / 2;

    const { mode, selectedItemId } = useGameStore();
    const isSelected = mode === GameMode.CUSTOMIZE && selectedItemId === item.id;

    let ModelComponent: React.ReactNode;
    switch (item.type) {
        case FurnitureType.PODIUM:       ModelComponent = <PodiumModel isNear={isNear} />; break;
        case FurnitureType.TEACHER_DESK: ModelComponent = <TeacherDeskModel isNear={isNear} />; break;
        case FurnitureType.BLACKBOARD:   ModelComponent = <BlackboardModel />; break;
        case FurnitureType.STUDENT_DESK: ModelComponent = <StudentDeskModel />; break;
        case FurnitureType.DOOR:         ModelComponent = <DoorFrameModel isNear={isNear} />; break;
        case FurnitureType.BOOKSHELF:    ModelComponent = <BookshelfModel />; break;
        case FurnitureType.POTTED_PLANT: ModelComponent = <PottedPlantModel />; break;
        case FurnitureType.WALL_CLOCK:   ModelComponent = <WallClockModel />; break;
        case FurnitureType.AREA_RUG:     ModelComponent = <AreaRugModel />; break;
        default: return null;
    }

    return (
        <group position={pos} rotation={[0, yRot, 0]}>
            {ModelComponent}
            {isSelected && (
                <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.6, 0.7, 32]} />
                    <meshBasicMaterial color="#FFD54F" transparent opacity={0.7} />
                </mesh>
            )}
        </group>
    );
};

// ─── Grid Overlay (CUSTOMIZE mode) ──────────────────────────────────────────

const GridOverlay = () => {
    const { mode } = useGameStore();
    if (mode !== GameMode.CUSTOMIZE) return null;

    return (
        <group position={[0, 0.02, 0]}>
            {Array.from({ length: ROOM_WIDTH + 1 }).map((_, i) => (
                <mesh key={`v-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[i - HALF_W, 0, 0]}>
                    <planeGeometry args={[0.03, ROOM_DEPTH]} />
                    <meshBasicMaterial color="#5D4037" transparent opacity={0.12} />
                </mesh>
            ))}
            {Array.from({ length: ROOM_DEPTH + 1 }).map((_, i) => (
                <mesh key={`h-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, i - HALF_D]}>
                    <planeGeometry args={[ROOM_WIDTH, 0.03]} />
                    <meshBasicMaterial color="#5D4037" transparent opacity={0.12} />
                </mesh>
            ))}
        </group>
    );
};

// ─── Ghost Preview (CUSTOMIZE mode) ─────────────────────────────────────────

const GhostPreview = () => {
    const { placingType, selectedItemId, ghostRotation, hoveredCell, placedFurniture } = useGameStore();

    if (!hoveredCell) return null;

    let size: [number, number];
    let rotation = ghostRotation;

    if (placingType) {
        size = FURNITURE_CATALOG[placingType].size;
    } else if (selectedItemId) {
        const item = placedFurniture.find(f => f.id === selectedItemId);
        if (!item) return null;
        size = FURNITURE_CATALOG[item.type].size;
    } else {
        return null;
    }

    const [w, d] = getEffectiveSize(size, rotation);
    const [cx, cz] = getWorldCenter(hoveredCell[0], hoveredCell[1], size, rotation);
    const valid = canPlace(hoveredCell[0], hoveredCell[1], size, rotation, placedFurniture, selectedItemId || undefined);

    return (
        <mesh position={[cx, 0.15, cz]}>
            <boxGeometry args={[w - 0.05, 0.3, d - 0.05]} />
            <meshBasicMaterial color={valid ? '#4CAF50' : '#F44336'} transparent opacity={0.35} />
        </mesh>
    );
};

// ─── Floor Raycaster (CUSTOMIZE mode) ───────────────────────────────────────

const FloorRaycaster = () => {
    const { mode, customizeState, setHoveredCell, confirmPlacement, selectItem, placedFurniture } = useGameStore();
    if (mode !== GameMode.CUSTOMIZE) return null;

    const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        const [gx, gz] = worldToGrid(e.point.x, e.point.z);
        if (gx >= 0 && gx < ROOM_WIDTH && gz >= 0 && gz < ROOM_DEPTH) {
            setHoveredCell([gx, gz]);
        } else {
            setHoveredCell(null);
        }
    };

    const handlePointerLeave = () => {
        setHoveredCell(null);
    };

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        const [gx, gz] = worldToGrid(e.point.x, e.point.z);
        const state = useGameStore.getState();

        if (state.placingType || state.selectedItemId) {
            confirmPlacement(gx, gz);
        } else if (customizeState === 'browsing') {
            const clicked = findFurnitureAtCell(gx, gz, placedFurniture);
            if (clicked) {
                const catalog = FURNITURE_CATALOG[clicked.type];
                if (!catalog.fixed) selectItem(clicked.id);
            }
        }
    };

    return (
        <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.005, 0]}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onClick={handleClick}
        >
            <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
            <meshBasicMaterial transparent opacity={0} />
        </mesh>
    );
};

// ─── Student GLB Models + Wandering ─────────────────────────────────────────

const STUDENT_MODELS: Record<string, { model: string; walk: string; run: string }> = {
    luna:    { model: '/models/luna.glb',    walk: '/models/luna_walk.glb',    run: '/models/luna_run.glb' },
    barnaby: { model: '/models/barnaby.glb', walk: '/models/barnaby_walk.glb', run: '/models/barnaby_run.glb' },
    pip:     { model: '/models/pip.glb',     walk: '/models/pip_walk.glb',     run: '/models/pip_run.glb' },
    oliver:  { model: '/models/oliver.glb',  walk: '/models/oliver_walk.glb',  run: '/models/oliver_run.glb' },
};

const liveStudentPositions: Record<string, [number, number, number]> = {};

const WANDER_NODES: [number, number, number][] = [
    [-3, 0, -2.5], [-1, 0, -2.5], [1, 0, -2.5], [3, 0, -2.5],
    [-3, 0, -0.5], [0, 0, -0.5], [3, 0, -0.5],
    [-2, 0, 1], [0, 0, 1], [2, 0, 1],
    [-1.5, 0, 2.5], [0, 0, 2.5], [1.5, 0, 2.5],
];

// ─── Student Conversation System ─────────────────────────────────────────────

const CHAT_EMOTES = [
    ['haha!', '😄'], ['oh!', '💡'], ['hmm...', '🤔'], ['nice!', '✨'],
    ['wow!', '😮'], ['really?', '👀'], ['right!', '😊'], ['cool!', '🎉'],
    ['wait...', '🤨'], ['oh no!', '😱'], ['yep!', '👍'], ['whoa!', '🌟'],
];

interface ActiveConvo {
    idA: string;
    idB: string;
    phase: 'approach' | 'chat' | 'done';
    startedAt: number;
    chatUntil: number;
    emoteIndex: number;
    nextEmoteAt: number;
}

const studentConvos: { list: ActiveConvo[]; nextCheck: number } = { list: [], nextCheck: 8000 + Math.random() * 10000 };

function getConvoForStudent(id: string): ActiveConvo | undefined {
    return studentConvos.list.find(c => (c.idA === id || c.idB === id) && c.phase !== 'done');
}

function getConvoEmote(convo: ActiveConvo, id: string): string | undefined {
    if (convo.phase !== 'chat') return undefined;
    const emote = CHAT_EMOTES[convo.emoteIndex % CHAT_EMOTES.length];
    return id === convo.idA ? emote[0] : emote[1];
}

function tickConvoSystem(delta: number, studentIds: string[]) {
    studentConvos.nextCheck -= delta * 1000;

    for (let i = studentConvos.list.length - 1; i >= 0; i--) {
        const c = studentConvos.list[i];
        if (c.phase === 'done') { studentConvos.list.splice(i, 1); continue; }

        if (c.phase === 'approach') {
            const posA = liveStudentPositions[c.idA];
            const posB = liveStudentPositions[c.idB];
            if (posA && posB) {
                const dx = posA[0] - posB[0], dz = posA[2] - posB[2];
                if (Math.sqrt(dx * dx + dz * dz) < 1.2) {
                    c.phase = 'chat';
                    c.chatUntil = Date.now() + 4000 + Math.random() * 4000;
                    c.nextEmoteAt = Date.now() + 800;
                }
            }
            if (Date.now() - c.startedAt > 12000) c.phase = 'done';
        }

        if (c.phase === 'chat') {
            if (Date.now() > c.nextEmoteAt) {
                c.emoteIndex = (c.emoteIndex + 1) % CHAT_EMOTES.length;
                c.nextEmoteAt = Date.now() + 1500 + Math.random() * 1500;
            }
            if (Date.now() > c.chatUntil) c.phase = 'done';
        }
    }

    if (studentConvos.nextCheck <= 0 && studentConvos.list.length < 2) {
        studentConvos.nextCheck = 120000 + Math.random() * 120000;
        const idle = studentIds.filter(id => !getConvoForStudent(id));
        if (idle.length >= 2) {
            const shuffled = idle.sort(() => Math.random() - 0.5);
            studentConvos.list.push({
                idA: shuffled[0], idB: shuffled[1],
                phase: 'approach',
                startedAt: Date.now(),
                chatUntil: 0,
                emoteIndex: Math.floor(Math.random() * CHAT_EMOTES.length),
                nextEmoteAt: 0,
            });
        }
    }
}

function isPositionBlockedByFurniture(x: number, z: number, furniture: any[]): boolean {
    for (const item of furniture) {
        const catalog = FURNITURE_CATALOG[item.type];
        if (catalog.passthrough || catalog.wallMounted) continue;
        const [w, d] = getEffectiveSize(catalog.size, item.rotation);
        const [cx, cz] = getWorldCenter(item.gridX, item.gridZ, catalog.size, item.rotation);
        const margin = 0.4;
        if (Math.abs(x - cx) < (w / 2 + margin) && Math.abs(z - cz) < (d / 2 + margin)) {
            return true;
        }
    }
    return false;
}

function lerpAngle(a: number, b: number, t: number): number {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
}

const StudentGLBBody = ({ studentId, isWalking }: { studentId: string; isWalking: boolean }) => {
    const config = STUDENT_MODELS[studentId];
    const { scene, animations } = useGLTF(config.model);
    const walkGltf = useGLTF(config.walk);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const actionRef = useRef<THREE.AnimationAction | null>(null);

    const timeOffset = useRef(
        (studentId.charCodeAt(0) + (studentId.charCodeAt(1) || 0)) * 0.37 % 3.0
    );

    useEffect(() => {
        scene.traverse((child: any) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }, [scene]);

    useEffect(() => {
        const allAnims = [...animations, ...walkGltf.animations];
        if (allAnims.length === 0) return;

        const mixer = new THREE.AnimationMixer(scene);
        mixerRef.current = mixer;

        const walkClip = allAnims.find(a => /walk/i.test(a.name));
        const clip = walkClip || allAnims[0];
        const action = mixer.clipAction(clip);
        actionRef.current = action;
        action.play();
        action.time = timeOffset.current;
        action.timeScale = 0.08;

        return () => { mixer.stopAllAction(); mixer.uncacheRoot(scene); };
    }, [scene, animations, walkGltf.animations]);

    useEffect(() => {
        if (actionRef.current) {
            actionRef.current.timeScale = isWalking ? 0.85 : 0.08;
        }
    }, [isWalking]);

    useFrame((_, delta) => {
        mixerRef.current?.update(delta);
    });

    return <primitive object={scene} scale={0.8} />;
};

// ─── Student Model ──────────────────────────────────────────────────────────

interface StudentModelProps {
    student: any;
    isInteracting: boolean;
}

const StudentModel: React.FC<StudentModelProps> = ({ student, isInteracting }) => {
    const groupRef = useRef<THREE.Group>(null);
    const innerRef = useRef<THREE.Group>(null);
    const { callOnStudent, clearStudentDialogue } = useGameStore();

    const posRef = useRef(new THREE.Vector3(...student.position));
    const spawnPos = useRef(new THREE.Vector3(...student.position));
    const targetRef = useRef<THREE.Vector3 | null>(null);
    const pauseRef = useRef(1000 + Math.random() * 2000);
    const [isWalking, setIsWalking] = useState(false);
    const [chatBubble, setChatBubble] = useState<string | undefined>(undefined);
    const lastBubble = useRef('');

    useEffect(() => {
        if (groupRef.current) groupRef.current.position.copy(posRef.current);
    }, []);

    useEffect(() => {
        if (student.currentDialogue) {
            const t = setTimeout(() => clearStudentDialogue(student.id), 6000);
            return () => clearTimeout(t);
        }
    }, [student.currentDialogue, student.id, clearStudentDialogue]);

    useFrame((state, delta) => {
        if (!groupRef.current || !innerRef.current) return;
        const { mode, placedFurniture, students: allStudents } = useGameStore.getState();

        tickConvoSystem(delta, allStudents.map(s => s.id));
        const convo = getConvoForStudent(student.id);

        if (mode === GameMode.FREE_ROAM && !isInteracting && !student.currentDialogue) {
            if (convo && convo.phase === 'approach' && convo.idA === student.id) {
                const partnerPos = liveStudentPositions[convo.idB];
                if (partnerPos) {
                    const meetPoint = new THREE.Vector3(
                        (posRef.current.x + partnerPos[0]) / 2,
                        0,
                        (posRef.current.z + partnerPos[2]) / 2,
                    );
                    const dir = new THREE.Vector3().subVectors(meetPoint, posRef.current);
                    dir.y = 0;
                    if (dir.length() > 0.3) {
                        dir.normalize().multiplyScalar(0.014);
                        posRef.current.add(dir);
                        const targetAngle = Math.atan2(dir.x, dir.z);
                        groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, targetAngle, 0.1);
                        if (!isWalking) setIsWalking(true);
                    }
                }
            } else if (convo && convo.phase === 'approach' && convo.idB === student.id) {
                const partnerPos = liveStudentPositions[convo.idA];
                if (partnerPos) {
                    const meetPoint = new THREE.Vector3(
                        (posRef.current.x + partnerPos[0]) / 2,
                        0,
                        (posRef.current.z + partnerPos[2]) / 2,
                    );
                    const dir = new THREE.Vector3().subVectors(meetPoint, posRef.current);
                    dir.y = 0;
                    if (dir.length() > 0.3) {
                        dir.normalize().multiplyScalar(0.014);
                        posRef.current.add(dir);
                        const targetAngle = Math.atan2(dir.x, dir.z);
                        groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, targetAngle, 0.1);
                        if (!isWalking) setIsWalking(true);
                    }
                }
            } else if (convo && convo.phase === 'chat') {
                if (isWalking) setIsWalking(false);
                if (targetRef.current) targetRef.current = null;
                const partnerId = convo.idA === student.id ? convo.idB : convo.idA;
                const partnerPos = liveStudentPositions[partnerId];
                if (partnerPos) {
                    const dx = partnerPos[0] - posRef.current.x;
                    const dz = partnerPos[2] - posRef.current.z;
                    const lookAngle = Math.atan2(dx, dz);
                    groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, lookAngle, 0.12);
                }
                const emote = getConvoEmote(convo, student.id);
                if (emote !== lastBubble.current) {
                    lastBubble.current = emote || '';
                    setChatBubble(emote);
                }
            } else {
                if (chatBubble) { setChatBubble(undefined); lastBubble.current = ''; }

                if (!targetRef.current) {
                    pauseRef.current -= delta * 1000;
                    if (pauseRef.current <= 0) {
                        let dest: THREE.Vector3 | null = null;
                        for (let attempt = 0; attempt < 8; attempt++) {
                            const candidate = Math.random() < 0.1
                                ? spawnPos.current.clone()
                                : new THREE.Vector3(...WANDER_NODES[Math.floor(Math.random() * WANDER_NODES.length)]);
                            if (!isPositionBlockedByFurniture(candidate.x, candidate.z, placedFurniture)) {
                                dest = candidate;
                                break;
                            }
                        }
                        if (dest) {
                            targetRef.current = dest;
                            setIsWalking(true);
                        } else {
                            pauseRef.current = 1500 + Math.random() * 2000;
                        }
                    }
                } else {
                    const dir = new THREE.Vector3().subVectors(targetRef.current, posRef.current);
                    dir.y = 0;
                    if (dir.length() < 0.15) {
                        posRef.current.copy(targetRef.current);
                        targetRef.current = null;
                        setIsWalking(false);
                        pauseRef.current = 1500 + Math.random() * 3000;
                    } else {
                        if (isPositionBlockedByFurniture(
                            posRef.current.x + dir.normalize().x * 0.3,
                            posRef.current.z + dir.normalize().z * 0.3,
                            placedFurniture
                        )) {
                            targetRef.current = null;
                            setIsWalking(false);
                            pauseRef.current = 1000 + Math.random() * 1500;
                        } else {
                            dir.normalize().multiplyScalar(0.012);
                            posRef.current.add(dir);
                            const targetAngle = Math.atan2(dir.x, dir.z);
                            groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, targetAngle, 0.08);
                        }
                    }
                }
            }
        } else if (mode !== GameMode.FREE_ROAM) {
            if (targetRef.current) { targetRef.current = null; setIsWalking(false); }
        }

        if (isInteracting || student.currentDialogue) {
            const playerPos = useGameStore.getState().playerPos;
            const dx = playerPos[0] - posRef.current.x;
            const dz = playerPos[2] - posRef.current.z;
            const lookAngle = Math.atan2(dx, dz);
            groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, lookAngle, 0.1);
            if (targetRef.current) { targetRef.current = null; setIsWalking(false); }
        } else if (!targetRef.current && !convo) {
            if (student.mood === 'happy') {
                const swayAngle = Math.sin(state.clock.elapsedTime * 2) * 0.06;
                groupRef.current.rotation.y = lerpAngle(groupRef.current.rotation.y, swayAngle, 0.02);
            }
        }

        const idOffset = (student.id.charCodeAt(0) + (student.id.charCodeAt(1) || 0)) * 1.7;
        const inConvoChat = convo?.phase === 'chat';
        if (!targetRef.current && !isWalking) {
            const bobSpeed = inConvoChat ? 2.5 : (1.3 + (idOffset % 0.5));
            const bobAmp = inConvoChat ? 0.04 : 0.025;
            innerRef.current.position.y = Math.sin(state.clock.elapsedTime * bobSpeed + idOffset) * bobAmp;
        } else {
            innerRef.current.position.y = 0;
        }

        groupRef.current.position.set(posRef.current.x, posRef.current.y, posRef.current.z);
        liveStudentPositions[student.id] = [posRef.current.x, posRef.current.y, posRef.current.z];
    });

    const bubbleText = student.currentDialogue || chatBubble;

    return (
        <group ref={groupRef}>
            <group ref={innerRef}>
                <Float speed={2} rotationIntensity={0} floatIntensity={0.2} position={[0, 2.2, 0]}>
                    <AsyncText fontSize={0.25} color="#5D4037" anchorX="center" anchorY="middle" font={FREDOKA_FONT}>
                        {student.name}
                    </AsyncText>
                </Float>

                <SpeechBubble text={bubbleText} visible={!!bubbleText} />
                <StatusIndicator type={student.handRaised ? 'raise_hand' : null} onClick={() => callOnStudent(student.id)} />
                <ReactionEmoji mood={student.mood} />

                <Suspense fallback={
                    <mesh castShadow position={[0, 0.7, 0]}>
                        <capsuleGeometry args={[0.3, 0.8, 4, 8]} />
                        <meshStandardMaterial color={student.color} />
                    </mesh>
                }>
                    <StudentGLBBody studentId={student.id} isWalking={isWalking} />
                </Suspense>

                {isInteracting && (
                    <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[0.8, 0.9, 32]} />
                        <meshBasicMaterial color="#AED581" transparent opacity={0.6} />
                    </mesh>
                )}
            </group>
        </group>
    );
};

// ─── Multiplayer Door ────────────────────────────────────────────────────────

const MultiplayerDoor = () => {
    const { mode, interactionTarget, setInteractionTarget } = useGameStore();
    const doorPos: [number, number, number] = [HALF_W - 0.15, 0, 0];
    const isNear = interactionTarget?.type === 'multiplayer_door';

    useFrame(() => {
        if (mode !== GameMode.FREE_ROAM) return;
        const { playerPos } = useGameStore.getState();
        const dx = playerPos[0] - doorPos[0];
        const dz = playerPos[2] - doorPos[2];
        if (Math.sqrt(dx * dx + dz * dz) < 1.8) {
            if (!interactionTarget || interactionTarget.type !== 'multiplayer_door') {
                setInteractionTarget({ type: 'multiplayer_door', label: 'Visit Other Classrooms' });
            }
        }
    });

    return (
        <group position={doorPos} rotation={[0, -Math.PI / 2, 0]}>
            {/* Door frame */}
            <mesh position={[0, 1.3, 0]} castShadow>
                <boxGeometry args={[1.1, 2.6, 0.15]} />
                <meshStandardMaterial color="#5D3A1A" roughness={0.7} />
            </mesh>
            {/* Door panel */}
            <mesh position={[0, 1.3, 0.04]}>
                <boxGeometry args={[0.9, 2.4, 0.08]} />
                <meshStandardMaterial color={isNear ? '#D4A76A' : '#8B6842'} roughness={0.5} />
            </mesh>
            {/* Doorknob */}
            <mesh position={[0.32, 1.2, 0.12]}>
                <sphereGeometry args={[0.06, 12, 12]} />
                <meshStandardMaterial color="#D4A76A" metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Sign above door */}
            <group position={[0, 2.8, 0.05]}>
                <mesh>
                    <boxGeometry args={[0.9, 0.25, 0.04]} />
                    <meshStandardMaterial color="#FFF3E0" />
                </mesh>
                <AsyncText position={[0, 0, 0.03]} fontSize={0.1} color="#5D3A1A" anchorX="center" anchorY="middle" font={FREDOKA_FONT}>
                    Multiplayer
                </AsyncText>
            </group>
            {/* Glow when near */}
            {isNear && (
                <pointLight position={[0, 1.5, 0.5]} intensity={0.5} color="#FFD54F" distance={3} decay={2} />
            )}
        </group>
    );
};

// ─── Player Controller ──────────────────────────────────────────────────────

// ─── Dust Particles ─────────────────────────────────────────────────────────

const PARTICLE_COUNT = 20;

const DustParticles = ({ active, intensity }: { active: boolean; intensity: number }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const particles = useRef<{ pos: THREE.Vector3; vel: THREE.Vector3; life: number; maxLife: number }[]>([]);
    const dummy = React.useMemo(() => new THREE.Object3D(), []);
    const spawnTimer = useRef(0);

    useFrame((_, delta) => {
        if (!meshRef.current) return;

        if (active) {
            spawnTimer.current += delta;
            const spawnRate = intensity > 0.5 ? 0.03 : 0.08;
            while (spawnTimer.current > spawnRate && particles.current.length < PARTICLE_COUNT) {
                spawnTimer.current -= spawnRate;
                const spread = intensity > 0.5 ? 0.4 : 0.25;
                particles.current.push({
                    pos: new THREE.Vector3(
                        (Math.random() - 0.5) * spread,
                        0.02,
                        (Math.random() - 0.5) * spread
                    ),
                    vel: new THREE.Vector3(
                        (Math.random() - 0.5) * 0.5,
                        Math.random() * 1.2 + 0.3,
                        (Math.random() - 0.5) * 0.5
                    ),
                    life: 0,
                    maxLife: 0.4 + Math.random() * 0.4,
                });
            }
        }

        for (let i = particles.current.length - 1; i >= 0; i--) {
            const p = particles.current[i];
            p.life += delta;
            if (p.life >= p.maxLife) {
                particles.current.splice(i, 1);
                continue;
            }
            p.pos.addScaledVector(p.vel, delta);
            p.vel.y -= delta * 2;
        }

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            if (i < particles.current.length) {
                const p = particles.current[i];
                const t = p.life / p.maxLife;
                const scale = (1 - t) * 0.08;
                dummy.position.copy(p.pos);
                dummy.scale.setScalar(scale);
            } else {
                dummy.scale.setScalar(0);
                dummy.position.set(0, -10, 0);
            }
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
            <sphereGeometry args={[1, 6, 6]} />
            <meshStandardMaterial color="#D7CCC8" transparent opacity={0.6} roughness={1} />
        </instancedMesh>
    );
};

// ─── Teacher Model ──────────────────────────────────────────────────────────

const TeacherModel = React.forwardRef<THREE.Group, { visible: boolean; isMoving: boolean; isSprinting: boolean }>(({ visible, isMoving, isSprinting }, ref) => {
    const { scene, animations } = useGLTF('/models/teacher.glb');
    const animGltf = useGLTF('/models/teacher_animations.glb');
    const groupRef = useRef<THREE.Group>(null);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const actionsRef = useRef<Record<string, THREE.AnimationAction>>({});
    const currentAction = useRef<string | null>(null);

    React.useImperativeHandle(ref, () => groupRef.current!);

    useEffect(() => {
        scene.traverse((child: any) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }, [scene]);

    const animNames = React.useMemo(() => {
        const allAnims = [...animations, ...animGltf.animations];
        const mixer = new THREE.AnimationMixer(scene);
        mixerRef.current = mixer;
        const acts: Record<string, THREE.AnimationAction> = {};
        for (const clip of allAnims) {
            acts[clip.name] = mixer.clipAction(clip);
        }
        actionsRef.current = acts;
        return allAnims.map(a => a.name);
    }, [scene, animations, animGltf.animations]);

    useFrame((_, delta) => {
        mixerRef.current?.update(delta);
    });

    useEffect(() => {
        if (animNames.length === 0) return;
        const walkName = animNames.find(n => /walk/i.test(n));
        const runName = animNames.find(n => /run/i.test(n));
        const idleName = animNames.find(n => /idle/i.test(n))
            || animNames.find(n => /clip0|baselayer/i.test(n))
            || animNames[0];

        let targetName: string | undefined;
        if (isMoving && isSprinting && runName) targetName = runName;
        else if (isMoving && walkName) targetName = walkName;
        else targetName = idleName;

        if (!targetName || currentAction.current === targetName) return;

        if (currentAction.current && actionsRef.current[currentAction.current]) {
            actionsRef.current[currentAction.current].fadeOut(0.2);
        }
        if (actionsRef.current[targetName]) {
            actionsRef.current[targetName].reset().fadeIn(0.2).play();
        }
        currentAction.current = targetName;
    }, [isMoving, isSprinting, animNames]);

    return (
        <group ref={groupRef} visible={visible}>
            <primitive object={scene} scale={0.9} />
        </group>
    );
});

const WALK_SPEED = 0.025;
const SPRINT_SPEED = 0.06;

const PlayerController = () => {
    const { setPlayerPos, setInteractionTarget, students, mode, placedFurniture } = useGameStore();
    const playerRef = useRef<THREE.Group>(null);
    const modelRef = useRef<THREE.Group>(null);
    const [, get] = useKeyboardControls();
    const vec = new THREE.Vector3();
    const [isMoving, setIsMoving] = React.useState(false);
    const [isSprinting, setIsSprinting] = React.useState(false);

    useFrame(() => {
        if (mode !== GameMode.FREE_ROAM) return;
        if (!playerRef.current) return;

        const { forward, backward, left, right, sprint } = get();
        const joy = getJoystickState();
        let x = Number(right) - Number(left);
        let z = Number(backward) - Number(forward);
        if (joy.active) { x += joy.x; z += joy.z; }
        const moving = x !== 0 || z !== 0;
        const sprinting = moving && !joy.active && !!sprint;
        const speed = sprinting ? SPRINT_SPEED : WALK_SPEED;

        if (moving) {
            vec.set(x, 0, z).normalize().multiplyScalar(speed);
            playerRef.current.position.add(vec);
            playerRef.current.rotation.y = Math.atan2(x, z);
        }

        if (moving !== isMoving) setIsMoving(moving);
        if (sprinting !== isSprinting) setIsSprinting(sprinting);

        playerRef.current.position.x = THREE.MathUtils.clamp(playerRef.current.position.x, -HALF_W + 1, HALF_W - 1);
        playerRef.current.position.z = THREE.MathUtils.clamp(playerRef.current.position.z, -HALF_D + 1, HALF_D - 1);
        setPlayerPos([playerRef.current.position.x, playerRef.current.position.y, playerRef.current.position.z]);

        let targetFound = false;
        for (const item of placedFurniture) {
            const catalog = FURNITURE_CATALOG[item.type];
            if (!catalog.interactionType) continue;
            const [cx, cz] = getWorldCenter(item.gridX, item.gridZ, catalog.size, item.rotation);
            const fPos = new THREE.Vector3(cx, 0, cz);
            if (playerRef.current.position.distanceTo(fPos) < 1.8) {
                setInteractionTarget({ type: catalog.interactionType as any, id: item.id, label: catalog.interactionLabel || '' });
                targetFound = true;
                break;
            }
        }

        if (!targetFound) {
            for (const student of students) {
                const live = liveStudentPositions[student.id];
                const sPos = live ? new THREE.Vector3(...live) : new THREE.Vector3(...student.position);
                if (playerRef.current.position.distanceTo(sPos) < 1.5) {
                    setInteractionTarget({ type: 'student', id: student.id, label: `Talk to ${student.name}` });
                    targetFound = true;
                    break;
                }
            }
        }

        if (!targetFound) {
            const doorPos = [HALF_W - 0.15, 0, 0];
            const dx = playerRef.current.position.x - doorPos[0];
            const dz = playerRef.current.position.z - doorPos[2];
            if (Math.sqrt(dx * dx + dz * dz) < 1.8) {
                setInteractionTarget({ type: 'multiplayer_door', label: 'Visit Other Classrooms' });
            } else {
                setInteractionTarget(null);
            }
        }
    });

    const isVisible = mode !== GameMode.CUSTOMIZE && mode !== GameMode.MAIN_MENU;

    return (
        <group ref={playerRef} position={[0, 0, 2]}>
            <DustParticles active={isMoving && isVisible} intensity={isSprinting ? 1 : 0.3} />
            <Suspense fallback={
                <group visible={isVisible}>
                    <mesh castShadow position={[0, 0.7, 0]}>
                        <capsuleGeometry args={[0.3, 0.8, 4, 8]} />
                        <meshStandardMaterial color="#F48FB1" />
                    </mesh>
                </group>
            }>
                <TeacherModel ref={modelRef} visible={isVisible} isMoving={isMoving} isSprinting={isSprinting} />
            </Suspense>
        </group>
    );
};

// ─── Camera Controller ──────────────────────────────────────────────────────

const CameraController = () => {
    const { playerPos, mode } = useGameStore();
    const vec = new THREE.Vector3();

    useFrame((state) => {
        if (mode === GameMode.MAIN_MENU) {
            const t = state.clock.elapsedTime * 0.15;
            const radius = 16;
            const camX = Math.sin(t) * radius * 0.4;
            const camZ = Math.cos(t) * radius * 0.5 + 4;
            state.camera.position.lerp(vec.set(camX, 10, camZ), 0.02);
            state.camera.lookAt(0, 1, -1);
        } else if (mode === GameMode.FREE_ROAM) {
            const target = new THREE.Vector3(playerPos[0], playerPos[1], playerPos[2]);
            state.camera.position.lerp(vec.set(target.x * 0.5, 9, target.z * 0.3 + 12), 0.06);
            state.camera.lookAt(target.x * 0.5, 0, target.z * 0.3);
        } else if (mode === GameMode.CUSTOMIZE) {
            state.camera.position.lerp(vec.set(0, 14, 8), 0.06);
            state.camera.lookAt(0, 0, 0);
        } else if (mode === GameMode.TEACHING || mode === GameMode.LESSON_SETUP) {
            state.camera.position.lerp(vec.set(0, 6, 8), 0.05);
            state.camera.lookAt(0, 0.5, -1);
        } else if (mode === GameMode.DIALOGUE) {
            const target = new THREE.Vector3(playerPos[0], playerPos[1], playerPos[2]);
            state.camera.position.lerp(vec.set(target.x, target.y + 3, target.z + 5), 0.1);
            state.camera.lookAt(target);
        }
    });

    return null;
};

// ─── Ambient Dust Motes ─────────────────────────────────────────────────────

const DUST_MOTE_COUNT = 50;

const AmbientDust = () => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = React.useMemo(() => new THREE.Object3D(), []);
    const motes = React.useMemo(() =>
        Array.from({ length: DUST_MOTE_COUNT }, () => ({
            x: (Math.random() - 0.5) * ROOM_WIDTH * 0.85,
            y: Math.random() * (WALL_HEIGHT - 0.5) + 0.3,
            z: (Math.random() - 0.5) * ROOM_DEPTH * 0.85,
            speed: 0.06 + Math.random() * 0.14,
            phase: Math.random() * Math.PI * 2,
            s: 0.015 + Math.random() * 0.025,
        })), []
    );

    useFrame((state) => {
        if (!meshRef.current) return;
        const t = state.clock.elapsedTime;
        motes.forEach((m, i) => {
            dummy.position.set(
                m.x + Math.sin(t * m.speed + m.phase) * 0.6,
                m.y + Math.cos(t * m.speed * 0.6 + m.phase) * 0.4,
                m.z + Math.sin(t * m.speed * 0.4 + m.phase * 1.3) * 0.5
            );
            dummy.scale.setScalar(m.s);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, DUST_MOTE_COUNT]}>
            <sphereGeometry args={[1, 4, 4]} />
            <meshBasicMaterial color="#FFF8E1" transparent opacity={0.25} />
        </instancedMesh>
    );
};

// ─── GameScene ──────────────────────────────────────────────────────────────

export const GameScene = () => {
    const { students, interactionTarget, placedFurniture, mode } = useGameStore();

    return (
        <div className="w-full h-full absolute top-0 left-0 bg-[#FDF6E3]">
            <Canvas shadows camera={{ position: [0, 9, 12], fov: 40 }} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}>
                <KeyboardControls
                    map={[
                        { name: "forward", keys: ["ArrowUp", "w", "W"] },
                        { name: "backward", keys: ["ArrowDown", "s", "S"] },
                        { name: "left", keys: ["ArrowLeft", "a", "A"] },
                        { name: "right", keys: ["ArrowRight", "d", "D"] },
                        { name: "sprint", keys: ["ShiftLeft", "ShiftRight"] },
                    ]}
                >
                    <color attach="background" args={['#87CEAB']} />
                    <fog attach="fog" args={['#D7C9A8', 20, 38]} />
                    <hemisphereLight args={['#FFF3E0', '#A1887F', 0.85]} />
                    <directionalLight
                        castShadow position={[5, 10, 6]} intensity={1.1} color="#FFECD2"
                        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0001}
                        shadow-camera-left={-12} shadow-camera-right={12}
                        shadow-camera-top={12} shadow-camera-bottom={-12}
                    />
                    <directionalLight position={[-4, 6, -3]} intensity={0.25} color="#B3E5FC" />
                    <ambientLight intensity={0.3} color="#FFE0B2" />
                    <pointLight position={[0, WALL_HEIGHT - 0.3, 0]} intensity={0.6} color="#FFF3E0" distance={16} decay={2} />
                    <pointLight position={[-4, 3, -2]} intensity={0.2} color="#FFCC80" distance={8} decay={2} />
                    <pointLight position={[4, 3, 2]} intensity={0.2} color="#FFCC80" distance={8} decay={2} />
                    <Suspense fallback={null}>
                        <Environment preset="sunset" blur={0.8} />
                    </Suspense>
                    <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={22} blur={2.5} far={6} />

                    <ClassroomShell />

                    {/* Windows (structural, not moveable) */}
                    <WindowFrame position={[-HALF_W + 0.05, 2.0, -2]} rotation={[0, Math.PI / 2, 0]} />
                    <WindowFrame position={[-HALF_W + 0.05, 2.0, 2]} rotation={[0, Math.PI / 2, 0]} />

                    {/* Multiplayer door on right wall */}
                    <MultiplayerDoor />

                    <AmbientDust />

                    {/* Data-driven furniture */}
                    {placedFurniture.map(item => (
                        <FurnitureRenderer
                            key={item.id}
                            item={item}
                            isNear={
                                mode === GameMode.FREE_ROAM &&
                                interactionTarget?.id === item.id
                            }
                        />
                    ))}

                    {/* Students (hidden in CUSTOMIZE and MAIN_MENU modes) */}
                    {mode !== GameMode.CUSTOMIZE && mode !== GameMode.MAIN_MENU && students.map(student => (
                        <StudentModel
                            key={student.id}
                            student={student}
                            isInteracting={interactionTarget?.type === 'student' && interactionTarget.id === student.id}
                        />
                    ))}

                    <PlayerController />
                    <CameraController />

                    {/* Customize mode overlays */}
                    <GridOverlay />
                    <GhostPreview />
                    <FloorRaycaster />
                </KeyboardControls>
            </Canvas>
        </div>
    );
};
