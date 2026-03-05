import React, { useRef, Suspense, useEffect } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { useKeyboardControls, KeyboardControls, Environment, Text, Float, ContactShadows, Html, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { GameMode, Archetype, FurnitureType } from '../types';
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
            <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none shadow-xl border-2 border-gray-200 w-48 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="font-display font-medium text-gray-800 text-sm leading-tight">{text}</p>
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
                className="bg-cozy-green hover:bg-green-400 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg animate-bounce border-2 border-white transition-transform active:scale-90 cursor-pointer"
            >
                <span className="font-display font-bold text-xl">?</span>
            </button>
        </Html>
    );
};

const ReactionEmoji = ({ mood, customEmoji }: { mood: string, customEmoji?: string }) => {
    if (mood === 'neutral' && !customEmoji) return null;
    let emoji = '';
    if (customEmoji) emoji = customEmoji;
    else if (mood === 'happy') emoji = '⭐';
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

    return (
        <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
                <meshStandardMaterial color={floorColor} roughness={0.7} />
            </mesh>
            {Array.from({ length: 7 }).map((_, i) => (
                <mesh key={`plank-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-HALF_W + 2 * (i + 1), 0.001, 0]}>
                    <planeGeometry args={[0.02, ROOM_DEPTH]} />
                    <meshStandardMaterial color={plankColor} />
                </mesh>
            ))}

            {/* Back wall - transparent for camera */}
            <mesh position={[0, WALL_HEIGHT / 2, HALF_D]} receiveShadow>
                <boxGeometry args={[ROOM_WIDTH + wallThickness * 2, WALL_HEIGHT, wallThickness]} />
                <meshStandardMaterial color={wallColor} roughness={0.9} transparent opacity={0.15} />
            </mesh>
            {/* Front wall */}
            <mesh position={[0, WALL_HEIGHT / 2, -HALF_D]} receiveShadow>
                <boxGeometry args={[ROOM_WIDTH + wallThickness * 2, WALL_HEIGHT, wallThickness]} />
                <meshStandardMaterial color={wallColor} roughness={0.9} />
            </mesh>
            {/* Left wall */}
            <mesh position={[-HALF_W, WALL_HEIGHT / 2, 0]} receiveShadow>
                <boxGeometry args={[wallThickness, WALL_HEIGHT, ROOM_DEPTH]} />
                <meshStandardMaterial color={wallColor} roughness={0.9} />
            </mesh>
            {/* Right wall - transparent for camera */}
            <mesh position={[HALF_W, WALL_HEIGHT / 2, 0]} receiveShadow>
                <boxGeometry args={[wallThickness, WALL_HEIGHT, ROOM_DEPTH]} />
                <meshStandardMaterial color={wallColor} roughness={0.9} transparent opacity={0.15} />
            </mesh>

            {/* Baseboard trim */}
            <mesh position={[0, 0.1, HALF_D - 0.06]}>
                <boxGeometry args={[ROOM_WIDTH, 0.2, 0.05]} />
                <meshStandardMaterial color={trimColor} transparent opacity={0.15} />
            </mesh>
            <mesh position={[0, 0.1, -HALF_D + 0.06]}>
                <boxGeometry args={[ROOM_WIDTH, 0.2, 0.05]} />
                <meshStandardMaterial color={trimColor} />
            </mesh>
            <mesh position={[-HALF_W + 0.06, 0.1, 0]}>
                <boxGeometry args={[0.05, 0.2, ROOM_DEPTH]} />
                <meshStandardMaterial color={trimColor} />
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
                <meshStandardMaterial color={trimColor} />
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

// ─── Student Model ──────────────────────────────────────────────────────────

interface StudentModelProps {
    student: any;
    isInteracting: boolean;
}

const StudentModel: React.FC<StudentModelProps> = ({ student, isInteracting }) => {
    const groupRef = useRef<THREE.Group>(null);
    const innerRef = useRef<THREE.Group>(null);
    const { callOnStudent, clearStudentDialogue } = useGameStore();

    useEffect(() => {
        if (student.currentDialogue) {
            const t = setTimeout(() => clearStudentDialogue(student.id), 6000);
            return () => clearTimeout(t);
        }
    }, [student.currentDialogue, student.id, clearStudentDialogue]);

    useFrame((state) => {
        if (innerRef.current) {
            innerRef.current.position.y = Math.sin(state.clock.elapsedTime * 2 + student.position[0]) * 0.05;
            innerRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02;

            if (isInteracting || student.currentDialogue) {
                const playerPos = useGameStore.getState().playerPos;
                innerRef.current.lookAt(playerPos[0], innerRef.current.position.y, playerPos[2]);
            } else if (student.mood === 'happy') {
                innerRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 5) * 0.1;
            } else {
                innerRef.current.rotation.y = THREE.MathUtils.lerp(innerRef.current.rotation.y, 0, 0.1);
            }
        }
    });

    return (
        <group position={student.position} rotation={student.rotation} ref={groupRef}>
            <group ref={innerRef}>
                <Float speed={2} rotationIntensity={0} floatIntensity={0.2} position={[0, 2.2, 0]}>
                    <AsyncText fontSize={0.25} color="#5D4037" anchorX="center" anchorY="middle" font={FREDOKA_FONT}>
                        {student.name}
                    </AsyncText>
                </Float>

                <SpeechBubble text={student.currentDialogue} visible={!!student.currentDialogue} />
                <StatusIndicator type={student.handRaised ? 'raise_hand' : null} onClick={() => callOnStudent(student.id)} />
                <ReactionEmoji mood={student.mood} />

                {student.archetype === Archetype.EAGER_BIRD && (
                    <group>
                        <mesh castShadow receiveShadow position={[0, 0.75, 0]}>
                            <sphereGeometry args={[0.6, 32, 32]} />
                            <meshStandardMaterial color={student.color} roughness={0.6} />
                        </mesh>
                        <mesh position={[0, 0.8, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
                            <coneGeometry args={[0.15, 0.4, 32]} />
                            <meshStandardMaterial color="#FF9800" />
                        </mesh>
                    </group>
                )}
                {student.archetype === Archetype.SLOW_BEAR && (
                    <group>
                        <mesh castShadow receiveShadow position={[0, 0.9, 0]}>
                            <capsuleGeometry args={[0.6, 1.2, 4, 8]} />
                            <meshStandardMaterial color={student.color} roughness={0.8} />
                        </mesh>
                        <mesh position={[-0.4, 1.6, 0]}><sphereGeometry args={[0.25]} /><meshStandardMaterial color={student.color} /></mesh>
                        <mesh position={[0.4, 1.6, 0]}><sphereGeometry args={[0.25]} /><meshStandardMaterial color={student.color} /></mesh>
                    </group>
                )}
                {student.archetype === Archetype.SKEPTIC_SNAKE && (
                    <group>
                        <mesh castShadow receiveShadow position={[0, 0.4, 0]}><torusGeometry args={[0.5, 0.2, 16, 32]} /><meshStandardMaterial color={student.color} roughness={0.4} /></mesh>
                        <mesh castShadow receiveShadow position={[0, 0.8, 0]}><torusGeometry args={[0.4, 0.18, 16, 32]} /><meshStandardMaterial color={student.color} roughness={0.4} /></mesh>
                        <mesh castShadow receiveShadow position={[0, 1.2, 0.2]}><sphereGeometry args={[0.35]} /><meshStandardMaterial color={student.color} roughness={0.4} /></mesh>
                    </group>
                )}
                {student.archetype === Archetype.CURIOUS_CAT && (
                    <group>
                        <mesh castShadow receiveShadow position={[0, 0.7, 0]}>
                            <sphereGeometry args={[0.55, 32, 32]} />
                            <meshStandardMaterial color={student.color} roughness={0.6} />
                        </mesh>
                        {/* Ears */}
                        <mesh position={[-0.25, 1.25, 0]} rotation={[0, 0, -0.3]}>
                            <coneGeometry args={[0.15, 0.35, 4]} />
                            <meshStandardMaterial color={student.color} />
                        </mesh>
                        <mesh position={[0.25, 1.25, 0]} rotation={[0, 0, 0.3]}>
                            <coneGeometry args={[0.15, 0.35, 4]} />
                            <meshStandardMaterial color={student.color} />
                        </mesh>
                        {/* Inner ears */}
                        <mesh position={[-0.24, 1.22, 0.04]} rotation={[0, 0, -0.3]}>
                            <coneGeometry args={[0.08, 0.2, 4]} />
                            <meshStandardMaterial color="#F8BBD0" />
                        </mesh>
                        <mesh position={[0.24, 1.22, 0.04]} rotation={[0, 0, 0.3]}>
                            <coneGeometry args={[0.08, 0.2, 4]} />
                            <meshStandardMaterial color="#F8BBD0" />
                        </mesh>
                        {/* Tail */}
                        <mesh castShadow position={[0, 0.5, -0.5]} rotation={[0.5, 0, 0]}>
                            <capsuleGeometry args={[0.06, 0.6, 4, 8]} />
                            <meshStandardMaterial color={student.color} />
                        </mesh>
                    </group>
                )}
                {student.archetype === Archetype.SILENT_OWL && (
                    <group>
                        <mesh castShadow receiveShadow position={[0, 0.8, 0]}>
                            <capsuleGeometry args={[0.5, 0.8, 4, 8]} />
                            <meshStandardMaterial color={student.color} roughness={0.7} />
                        </mesh>
                        {/* Big eye circles */}
                        <mesh position={[-0.2, 1.0, 0.45]}>
                            <circleGeometry args={[0.2, 32]} />
                            <meshStandardMaterial color="#ECEFF1" />
                        </mesh>
                        <mesh position={[0.2, 1.0, 0.45]}>
                            <circleGeometry args={[0.2, 32]} />
                            <meshStandardMaterial color="#ECEFF1" />
                        </mesh>
                        {/* Beak */}
                        <mesh position={[0, 0.8, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
                            <coneGeometry args={[0.08, 0.2, 8]} />
                            <meshStandardMaterial color="#FF8F00" />
                        </mesh>
                        {/* Wing bumps */}
                        <mesh castShadow position={[-0.5, 0.7, 0]} rotation={[0, 0, 0.4]}>
                            <sphereGeometry args={[0.22, 16, 16]} />
                            <meshStandardMaterial color={student.color} roughness={0.8} />
                        </mesh>
                        <mesh castShadow position={[0.5, 0.7, 0]} rotation={[0, 0, -0.4]}>
                            <sphereGeometry args={[0.22, 16, 16]} />
                            <meshStandardMaterial color={student.color} roughness={0.8} />
                        </mesh>
                    </group>
                )}

                {/* Eyes - positioned based on archetype height */}
                {student.archetype !== Archetype.SILENT_OWL && (
                    <>
                        <mesh position={[-0.2, student.archetype === Archetype.SLOW_BEAR ? 1.3 : 0.9, 0.45]}><sphereGeometry args={[0.08]} /><meshStandardMaterial color="black" /></mesh>
                        <mesh position={[0.2, student.archetype === Archetype.SLOW_BEAR ? 1.3 : 0.9, 0.45]}><sphereGeometry args={[0.08]} /><meshStandardMaterial color="black" /></mesh>
                    </>
                )}
                {student.archetype === Archetype.SILENT_OWL && (
                    <>
                        <mesh position={[-0.2, 1.0, 0.48]}><sphereGeometry args={[0.1]} /><meshStandardMaterial color="#263238" /></mesh>
                        <mesh position={[0.2, 1.0, 0.48]}><sphereGeometry args={[0.1]} /><meshStandardMaterial color="#263238" /></mesh>
                    </>
                )}

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
            <primitive object={scene} scale={0.8} />
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
        const x = Number(right) - Number(left);
        const z = Number(backward) - Number(forward);
        const moving = x !== 0 || z !== 0;
        const sprinting = moving && !!sprint;
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
                const sPos = new THREE.Vector3(...student.position);
                if (playerRef.current.position.distanceTo(sPos) < 1.5) {
                    setInteractionTarget({ type: 'student', id: student.id, label: `Talk to ${student.name}` });
                    targetFound = true;
                    break;
                }
            }
        }

        if (!targetFound) setInteractionTarget(null);
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

// ─── GameScene ──────────────────────────────────────────────────────────────

export const GameScene = () => {
    const { students, interactionTarget, placedFurniture, mode } = useGameStore();

    return (
        <div className="w-full h-full absolute top-0 left-0 bg-[#FDF6E3]">
            <Canvas shadows camera={{ position: [0, 9, 12], fov: 40 }}>
                <KeyboardControls
                    map={[
                        { name: "forward", keys: ["ArrowUp", "w", "W"] },
                        { name: "backward", keys: ["ArrowDown", "s", "S"] },
                        { name: "left", keys: ["ArrowLeft", "a", "A"] },
                        { name: "right", keys: ["ArrowRight", "d", "D"] },
                        { name: "sprint", keys: ["ShiftLeft", "ShiftRight"] },
                    ]}
                >
                    <color attach="background" args={['#C8E6C9']} />
                    <hemisphereLight args={['#FFF8E1', '#D7CCC8', 0.7]} />
                    <directionalLight
                        castShadow position={[4, 8, 6]} intensity={0.9} color="#FFECB3"
                        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0001}
                        shadow-camera-left={-10} shadow-camera-right={10}
                        shadow-camera-top={10} shadow-camera-bottom={-10}
                    />
                    <ambientLight intensity={0.15} color="#FFE0B2" />
                    <Suspense fallback={null}>
                        <Environment preset="sunset" blur={0.8} />
                    </Suspense>
                    <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={20} blur={2} far={5} />

                    <ClassroomShell />

                    {/* Windows (structural, not moveable) */}
                    <WindowFrame position={[-HALF_W + 0.05, 2.0, -2]} rotation={[0, Math.PI / 2, 0]} />
                    <WindowFrame position={[-HALF_W + 0.05, 2.0, 2]} rotation={[0, Math.PI / 2, 0]} />

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
