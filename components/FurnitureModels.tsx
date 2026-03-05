import React, { useRef, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { HALF_D } from '../furnitureCatalog';

const WOOD_DARK = '#5D4037';
const WOOD_MED = '#8D6E63';
const WOOD_LIGHT = '#A1887F';
const WALL_TRIM_COLOR = '#D7CCC8';
const FREDOKA_FONT = 'https://fonts.gstatic.com/s/fredoka/v9/X7wo4b8k1r6otzZk_5tF.ttf';

const AsyncText = (props: any) => (
    <Suspense fallback={null}>
        <Text {...props} />
    </Suspense>
);

export const PodiumModel = ({ isNear }: { isNear?: boolean }) => (
    <group>
        <mesh castShadow receiveShadow position={[0, 0.55, 0]}>
            <boxGeometry args={[1.0, 1.1, 0.7]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.11, 0]} rotation={[-Math.PI / 8, 0, 0]}>
            <boxGeometry args={[0.9, 0.08, 0.55]} />
            <meshStandardMaterial color={WOOD_MED} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.55, 0.36]}>
            <boxGeometry args={[0.8, 0.9, 0.02]} />
            <meshStandardMaterial color={WOOD_MED} roughness={0.7} />
        </mesh>
        {isNear && (
            <AsyncText position={[0, 1.8, 0]} fontSize={0.25} color={WOOD_DARK} font={FREDOKA_FONT}>
                Start Lesson
            </AsyncText>
        )}
    </group>
);

export const TeacherDeskModel = ({ isNear }: { isNear?: boolean }) => (
    <group>
        <mesh castShadow receiveShadow position={[0, 0.75, 0]}>
            <boxGeometry args={[2.0, 0.08, 1.0]} />
            <meshStandardMaterial color={WOOD_MED} roughness={0.5} />
        </mesh>
        {[[-0.85, 0, -0.4], [0.85, 0, -0.4], [-0.85, 0, 0.4], [0.85, 0, 0.4]].map((pos, i) => (
            <mesh key={i} castShadow position={[pos[0], 0.37, pos[2]]}>
                <boxGeometry args={[0.08, 0.74, 0.08]} />
                <meshStandardMaterial color={WOOD_DARK} />
            </mesh>
        ))}
        <mesh position={[0, 0.55, 0.48]}>
            <boxGeometry args={[1.6, 0.3, 0.04]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.55, 0.52]}>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshStandardMaterial color="#FFD54F" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh castShadow position={[-0.6, 0.88, -0.1]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color="#E53935" roughness={0.6} />
        </mesh>
        <mesh castShadow position={[0.5, 0.84, -0.2]}>
            <boxGeometry args={[0.35, 0.1, 0.25]} />
            <meshStandardMaterial color="#42A5F5" roughness={0.7} />
        </mesh>
        <mesh castShadow position={[0.5, 0.92, -0.2]}>
            <boxGeometry args={[0.3, 0.06, 0.22]} />
            <meshStandardMaterial color="#66BB6A" roughness={0.7} />
        </mesh>
        {isNear && (
            <AsyncText position={[0, 1.5, 0]} fontSize={0.25} color={WOOD_DARK} font={FREDOKA_FONT}>
                Settings
            </AsyncText>
        )}
    </group>
);

export const BlackboardModel = () => (
    <group>
        <mesh position={[0, 2.0, 0]}>
            <boxGeometry args={[5.2, 2.4, 0.1]} />
            <meshStandardMaterial color={WOOD_MED} roughness={0.6} />
        </mesh>
        <mesh position={[0, 2.0, 0.06]}>
            <boxGeometry args={[4.8, 2.0, 0.02]} />
            <meshStandardMaterial color="#2E7D32" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.98, 0.12]}>
            <boxGeometry args={[4.8, 0.06, 0.1]} />
            <meshStandardMaterial color={WOOD_DARK} />
        </mesh>
        <mesh position={[-0.5, 1.05, 0.12]} rotation={[0, 0, Math.PI / 12]}>
            <cylinderGeometry args={[0.02, 0.02, 0.15, 8]} />
            <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[0.3, 1.05, 0.12]} rotation={[0, 0, -Math.PI / 15]}>
            <cylinderGeometry args={[0.02, 0.02, 0.12, 8]} />
            <meshStandardMaterial color="#FFEB3B" />
        </mesh>
    </group>
);

export const StudentDeskModel = () => (
    <group>
        <mesh castShadow receiveShadow position={[0, 0.6, 0]}>
            <boxGeometry args={[0.9, 0.06, 0.7]} />
            <meshStandardMaterial color={WOOD_LIGHT} roughness={0.5} />
        </mesh>
        {[[-0.35, 0, -0.25], [0.35, 0, -0.25], [-0.35, 0, 0.25], [0.35, 0, 0.25]].map((pos, i) => (
            <mesh key={i} castShadow position={[pos[0], 0.3, pos[2]]}>
                <boxGeometry args={[0.06, 0.6, 0.06]} />
                <meshStandardMaterial color={WOOD_DARK} />
            </mesh>
        ))}
        <group position={[0, 0, 0.7]}>
            <mesh castShadow position={[0, 0.4, 0]}>
                <boxGeometry args={[0.5, 0.05, 0.45]} />
                <meshStandardMaterial color={WOOD_MED} roughness={0.5} />
            </mesh>
            <mesh castShadow position={[0, 0.7, -0.2]}>
                <boxGeometry args={[0.45, 0.55, 0.05]} />
                <meshStandardMaterial color={WOOD_MED} roughness={0.5} />
            </mesh>
            {[[-0.2, 0, -0.18], [0.2, 0, -0.18], [-0.2, 0, 0.16], [0.2, 0, 0.16]].map((pos, i) => (
                <mesh key={i} position={[pos[0], 0.2, pos[2]]}>
                    <boxGeometry args={[0.04, 0.4, 0.04]} />
                    <meshStandardMaterial color={WOOD_DARK} />
                </mesh>
            ))}
        </group>
    </group>
);

export const DoorFrameModel = ({ isNear }: { isNear?: boolean }) => (
    <group>
        <mesh position={[0, 1.3, 0]}>
            <boxGeometry args={[1.4, 2.6, 0.15]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.25, 0.02]}>
            <boxGeometry args={[1.1, 2.3, 0.08]} />
            <meshStandardMaterial color={WOOD_MED} roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.8, 0.08]}>
            <boxGeometry args={[0.8, 0.8, 0.02]} />
            <meshStandardMaterial color={WOOD_LIGHT} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.8, 0.08]}>
            <boxGeometry args={[0.8, 0.8, 0.02]} />
            <meshStandardMaterial color={WOOD_LIGHT} roughness={0.6} />
        </mesh>
        <mesh position={[0.4, 1.2, 0.12]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial color="#FFD54F" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[0, 2.75, 0]}>
            <boxGeometry args={[1.1, 0.3, 0.04]} />
            <meshStandardMaterial color="#B3E5FC" transparent opacity={0.4} />
        </mesh>
        {isNear && (
            <AsyncText position={[0, 3.2, 0.2]} fontSize={0.25} color={WOOD_DARK} font={FREDOKA_FONT}>
                Exit
            </AsyncText>
        )}
    </group>
);

export const BookshelfModel = () => (
    <group>
        <mesh castShadow receiveShadow position={[0, 1.2, -0.3]}>
            <boxGeometry args={[1.8, 2.4, 0.06]} />
            <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
        </mesh>
        {[0.0, 0.7, 1.4, 2.1, 2.4].map((y, i) => (
            <mesh key={i} castShadow position={[0, y, 0]}>
                <boxGeometry args={[1.8, 0.06, 0.6]} />
                <meshStandardMaterial color={WOOD_MED} roughness={0.5} />
            </mesh>
        ))}
        <mesh castShadow position={[-0.87, 1.2, 0]}>
            <boxGeometry args={[0.06, 2.4, 0.6]} />
            <meshStandardMaterial color={WOOD_MED} roughness={0.5} />
        </mesh>
        <mesh castShadow position={[0.87, 1.2, 0]}>
            <boxGeometry args={[0.06, 2.4, 0.6]} />
            <meshStandardMaterial color={WOOD_MED} roughness={0.5} />
        </mesh>
        {[
            { pos: [-0.5, 0.35, 0], size: [0.12, 0.55, 0.35], color: '#E53935' },
            { pos: [-0.3, 0.30, 0], size: [0.1, 0.45, 0.35], color: '#1565C0' },
            { pos: [-0.1, 0.33, 0], size: [0.14, 0.5, 0.35], color: '#FFB300' },
            { pos: [0.15, 0.32, 0], size: [0.1, 0.48, 0.35], color: '#43A047' },
            { pos: [0.35, 0.28, 0], size: [0.12, 0.4, 0.35], color: '#7B1FA2' },
            { pos: [-0.4, 1.05, 0], size: [0.12, 0.55, 0.35], color: '#FF7043' },
            { pos: [-0.2, 1.02, 0], size: [0.1, 0.5, 0.35], color: '#26A69A' },
            { pos: [0.0, 1.07, 0], size: [0.14, 0.58, 0.35], color: '#5C6BC0' },
            { pos: [0.3, 1.0, 0], size: [0.11, 0.46, 0.35], color: '#EC407A' },
            { pos: [-0.3, 1.72, 0], size: [0.12, 0.5, 0.35], color: '#FFA726' },
            { pos: [0.0, 1.75, 0], size: [0.1, 0.55, 0.35], color: '#29B6F6' },
            { pos: [0.25, 1.70, 0], size: [0.13, 0.45, 0.35], color: '#AB47BC' },
        ].map((book, i) => (
            <mesh key={i} castShadow position={[book.pos[0], book.pos[1], book.pos[2]]}>
                <boxGeometry args={[book.size[0], book.size[1], book.size[2]]} />
                <meshStandardMaterial color={book.color} roughness={0.8} />
            </mesh>
        ))}
    </group>
);

export const PottedPlantModel = () => (
    <group>
        <mesh castShadow position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.22, 0.18, 0.4, 16]} />
            <meshStandardMaterial color="#D84315" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.02, 16]} />
            <meshStandardMaterial color="#4E342E" />
        </mesh>
        <mesh castShadow position={[0, 0.7, 0]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial color="#66BB6A" roughness={0.8} />
        </mesh>
        <mesh castShadow position={[0.15, 0.85, 0.1]}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial color="#81C784" roughness={0.8} />
        </mesh>
        <mesh castShadow position={[-0.12, 0.9, -0.08]}>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial color="#4CAF50" roughness={0.8} />
        </mesh>
    </group>
);

export const WallClockModel = () => {
    const handRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (handRef.current) {
            handRef.current.rotation.z = -state.clock.elapsedTime * 0.5;
        }
    });

    return (
        <group>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.4, 0.4, 0.08, 32]} />
                <meshStandardMaterial color={WOOD_DARK} roughness={0.5} />
            </mesh>
            <mesh position={[0, 0, 0.045]}>
                <circleGeometry args={[0.35, 32]} />
                <meshStandardMaterial color="#FFFDE7" />
            </mesh>
            {Array.from({ length: 12 }).map((_, i) => {
                const angle = (i / 12) * Math.PI * 2;
                return (
                    <mesh key={i} position={[Math.sin(angle) * 0.28, Math.cos(angle) * 0.28, 0.05]}>
                        <sphereGeometry args={[0.02, 8, 8]} />
                        <meshStandardMaterial color={WOOD_DARK} />
                    </mesh>
                );
            })}
            <mesh ref={handRef} position={[0, 0, 0.06]}>
                <boxGeometry args={[0.015, 0.25, 0.01]} />
                <meshStandardMaterial color={WOOD_DARK} />
            </mesh>
        </group>
    );
};

export const AreaRugModel = () => (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[5, 3]} />
        <meshStandardMaterial color="#E8D5B7" roughness={0.95} />
    </mesh>
);

export const WindowFrame = ({ position, rotation }: { position: [number, number, number], rotation?: [number, number, number] }) => (
    <group position={position} rotation={rotation || [0, 0, 0]}>
        <mesh>
            <boxGeometry args={[2.4, 1.8, 0.12]} />
            <meshStandardMaterial color={WOOD_LIGHT} roughness={0.5} />
        </mesh>
        <mesh position={[-0.55, 0.22, 0.02]}>
            <boxGeometry args={[1.0, 1.1, 0.02]} />
            <meshStandardMaterial color="#B3E5FC" transparent opacity={0.35} roughness={0.1} />
        </mesh>
        <mesh position={[0.55, 0.22, 0.02]}>
            <boxGeometry args={[1.0, 1.1, 0.02]} />
            <meshStandardMaterial color="#B3E5FC" transparent opacity={0.35} roughness={0.1} />
        </mesh>
        <mesh position={[0, 0.22, 0.04]}>
            <boxGeometry args={[0.06, 1.1, 0.04]} />
            <meshStandardMaterial color={WOOD_LIGHT} />
        </mesh>
        <mesh position={[0, 0.22, 0.04]}>
            <boxGeometry args={[2.2, 0.06, 0.04]} />
            <meshStandardMaterial color={WOOD_LIGHT} />
        </mesh>
        <mesh position={[0, -0.8, 0.15]}>
            <boxGeometry args={[2.6, 0.08, 0.3]} />
            <meshStandardMaterial color={WALL_TRIM_COLOR} />
        </mesh>
        <pointLight position={[0, 0, 0.5]} intensity={0.3} color="#FFF8E1" distance={5} />
    </group>
);
