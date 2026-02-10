import React, { useRef, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls, KeyboardControls, Environment, Text, Float, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { GameMode, Archetype } from '../types';

// --- Assets/Models (Procedural) ---

const AsyncText = (props: any) => {
    return (
        <Suspense fallback={null}>
            <Text {...props} />
        </Suspense>
    );
};

// 3D Speech Bubble Component
const SpeechBubble = ({ text, visible }: { text?: string, visible: boolean }) => {
    if (!visible || !text) return null;

    return (
        <Html position={[0, 2.3, 0]} center distanceFactor={10} zIndexRange={[100, 0]}>
            <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none shadow-xl border-2 border-gray-200 w-48 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="font-display font-medium text-gray-800 text-sm leading-tight">{text}</p>
            </div>
        </Html>
    );
}

// Hand Raise Indicator
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
    )
}

const ReactionEmoji = ({ mood, customEmoji }: { mood: string, customEmoji?: string }) => {
    if (mood === 'neutral' && !customEmoji) return null;
    
    let emoji = '';
    if (customEmoji) emoji = customEmoji;
    else if (mood === 'happy') emoji = '⭐';
    else if (mood === 'confused') emoji = '❓';
    else if (mood === 'sleeping') emoji = '💤';

    return (
        <Float speed={5} rotationIntensity={0} floatIntensity={1} position={[0.6, 2.5, 0]}>
             <AsyncText fontSize={0.6} outlineWidth={0.02} outlineColor="white">
                {emoji}
             </AsyncText>
        </Float>
    );
}

interface StudentModelProps {
    student: any;
    isInteracting: boolean;
}

const StudentModel: React.FC<StudentModelProps> = ({ student, isInteracting }) => {
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  const { callOnStudent, clearStudentDialogue } = useGameStore();

  // Auto-hide speech bubble after 6 seconds
  useEffect(() => {
    if (student.currentDialogue) {
        const t = setTimeout(() => {
            clearStudentDialogue(student.id);
        }, 6000);
        return () => clearTimeout(t);
    }
  }, [student.currentDialogue, student.id, clearStudentDialogue]);

  // Simple idle animation on inner group to preserve world position
  useFrame((state) => {
    if (innerRef.current) {
        // Breathe
        innerRef.current.position.y = Math.sin(state.clock.elapsedTime * 2 + student.position[0]) * 0.05;
        innerRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
        
        // Look at player if interacting or speaking
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
          {/* Name Tag */}
          <Float speed={2} rotationIntensity={0} floatIntensity={0.2} position={[0, 2.2, 0]}>
             <AsyncText 
                fontSize={0.25} 
                color="#5D4037" 
                anchorX="center" 
                anchorY="middle"
                font="https://fonts.gstatic.com/s/fredoka/v9/X7wo4b8k1r6otzZk_5tF.ttf"
             >
              {student.name}
            </AsyncText>
          </Float>

          {/* New Interaction UI Elements */}
          <SpeechBubble text={student.currentDialogue} visible={!!student.currentDialogue} />
          
          <StatusIndicator 
            type={student.handRaised ? 'raise_hand' : null} 
            onClick={() => callOnStudent(student.id)} 
          />

          {/* Emoji Reaction (Mood only, not speech related emojis for now to keep clean) */}
          <ReactionEmoji mood={student.mood} />

          {/* Body Shape based on Archetype */}
          {student.archetype === Archetype.EAGER_BIRD && (
            <group>
              <mesh castShadow receiveShadow position={[0, 0.75, 0]}>
                <sphereGeometry args={[0.6, 32, 32]} />
                <meshStandardMaterial color={student.color} roughness={0.6} />
              </mesh>
              {/* Beak */}
              <mesh position={[0, 0.8, 0.5]} rotation={[Math.PI/2, 0, 0]}>
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
              {/* Ears */}
              <mesh position={[-0.4, 1.6, 0]}>
                <sphereGeometry args={[0.25]} />
                <meshStandardMaterial color={student.color} />
              </mesh>
              <mesh position={[0.4, 1.6, 0]}>
                <sphereGeometry args={[0.25]} />
                <meshStandardMaterial color={student.color} />
              </mesh>
            </group>
          )}

          {student.archetype === Archetype.SKEPTIC_SNAKE && (
            <group>
                {/* Coiled Body */}
               <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
                <torusGeometry args={[0.5, 0.2, 16, 32]} />
                <meshStandardMaterial color={student.color} roughness={0.4} />
              </mesh>
              <mesh castShadow receiveShadow position={[0, 0.8, 0]}>
                <torusGeometry args={[0.4, 0.18, 16, 32]} />
                <meshStandardMaterial color={student.color} roughness={0.4} />
              </mesh>
              {/* Head */}
              <mesh castShadow receiveShadow position={[0, 1.2, 0.2]}>
                 <sphereGeometry args={[0.35]} />
                 <meshStandardMaterial color={student.color} roughness={0.4} />
              </mesh>
            </group>
          )}

          {/* Eyes (Generic) */}
          <mesh position={[-0.2, student.archetype === 'SLOW_BEAR' ? 1.3 : 0.9, 0.45]}>
            <sphereGeometry args={[0.08]} />
            <meshStandardMaterial color="black" />
          </mesh>
          <mesh position={[0.2, student.archetype === 'SLOW_BEAR' ? 1.3 : 0.9, 0.45]}>
            <sphereGeometry args={[0.08]} />
            <meshStandardMaterial color="black" />
          </mesh>

           {/* Interaction Ring */}
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

const Podium = ({ isNear }: { isNear: boolean }) => {
    return (
        <group position={[0, 0, 2]}>
            <mesh castShadow receiveShadow position={[0, 0.6, 0]}>
                <boxGeometry args={[1.5, 1.2, 0.8]} />
                <meshStandardMaterial color="#5D4037" />
            </mesh>
            <mesh position={[0, 1.21, 0]} rotation={[-Math.PI/6, 0, 0]}>
                 <boxGeometry args={[1.2, 0.1, 0.6]} />
                 <meshStandardMaterial color="#8D6E63" />
            </mesh>
            {isNear && (
                 <AsyncText 
                 position={[0, 2, 0]} 
                 fontSize={0.3} 
                 color="#5D4037" 
                 font="https://fonts.gstatic.com/s/fredoka/v9/X7wo4b8k1r6otzZk_5tF.ttf"
              >
               Start Lesson
             </AsyncText>
            )}
        </group>
    )
}

const PlayerController = () => {
    const { setPlayerPos, setInteractionTarget, students, mode } = useGameStore();
    const playerRef = useRef<THREE.Group>(null);
    const [, get] = useKeyboardControls();
    const vec = new THREE.Vector3();
    const speed = 0.1;

    useFrame((state) => {
        if (mode !== GameMode.FREE_ROAM) return;
        if (!playerRef.current) return;

        const { forward, backward, left, right } = get();
        
        const x = Number(right) - Number(left);
        const z = Number(backward) - Number(forward);

        // Movement
        if (x !== 0 || z !== 0) {
            vec.set(x, 0, z).normalize().multiplyScalar(speed);
            playerRef.current.position.add(vec);
            
            // Rotation to face direction
            const angle = Math.atan2(x, z);
            playerRef.current.rotation.y = angle;
        }

        // Keep bounds (simple room)
        playerRef.current.position.x = THREE.MathUtils.clamp(playerRef.current.position.x, -4.5, 4.5);
        playerRef.current.position.z = THREE.MathUtils.clamp(playerRef.current.position.z, -4.5, 4.5);

        // Update Global State position
        setPlayerPos([playerRef.current.position.x, playerRef.current.position.y, playerRef.current.position.z]);

        // Interaction Checks
        let targetFound = false;
        
        // Check Podium
        if (playerRef.current.position.distanceTo(new THREE.Vector3(0, 0, 2)) < 1.5) {
            setInteractionTarget({ type: 'podium', label: 'Start Lesson' });
            targetFound = true;
        } else {
            // Check Students
            for (const student of students) {
                const sPos = new THREE.Vector3(...student.position);
                if (playerRef.current.position.distanceTo(sPos) < 1.5) {
                    setInteractionTarget({ type: 'student', id: student.id, label: `Talk to ${student.name}` });
                    targetFound = true;
                    break;
                }
            }
        }

        if (!targetFound) {
            setInteractionTarget(null);
        }
    });

    return (
        <group ref={playerRef} position={[0, 0, 4]}>
            {/* Player Avatar - Cute Rabbit-ish */}
            <mesh castShadow position={[0, 0.7, 0]}>
                <capsuleGeometry args={[0.3, 0.8, 4, 8]} />
                <meshStandardMaterial color="#F48FB1" />
            </mesh>
            <mesh position={[-0.2, 1.3, 0]} rotation={[0.2, 0, -0.2]}>
                 <capsuleGeometry args={[0.1, 0.6]} />
                 <meshStandardMaterial color="#F48FB1" />
            </mesh>
             <mesh position={[0.2, 1.3, 0]} rotation={[0.2, 0, 0.2]}>
                 <capsuleGeometry args={[0.1, 0.6]} />
                 <meshStandardMaterial color="#F48FB1" />
            </mesh>
        </group>
    );
};

const CameraController = () => {
    const { playerPos, mode } = useGameStore();
    const vec = new THREE.Vector3();

    useFrame((state) => {
        if (mode === GameMode.FREE_ROAM) {
            // Isometric-ish Animal Crossing follow
            const target = new THREE.Vector3(playerPos[0], playerPos[1], playerPos[2]);
            state.camera.position.lerp(vec.set(target.x, target.y + 6, target.z + 8), 0.1);
            state.camera.lookAt(target);
        } else if (mode === GameMode.TEACHING || mode === GameMode.LESSON_SETUP) {
            // Focus on Podium/Class
            state.camera.position.lerp(vec.set(0, 4, 7), 0.05);
            state.camera.lookAt(0, 0.5, 0);
        } else if (mode === GameMode.DIALOGUE) {
             // Close up on player/student interaction? Or keep it simple
             const target = new THREE.Vector3(playerPos[0], playerPos[1], playerPos[2]);
             state.camera.position.lerp(vec.set(target.x, target.y + 3, target.z + 5), 0.1);
             state.camera.lookAt(target);
        }
    });

    return null;
}

export const GameScene = () => {
    const { students, interactionTarget, chatHistory } = useGameStore();
    
    return (
        <div className="w-full h-full absolute top-0 left-0 bg-[#FDF6E3]">
            <Canvas shadows camera={{ position: [0, 6, 8], fov: 45 }}>
                 <KeyboardControls
                    map={[
                        { name: "forward", keys: ["ArrowUp", "w", "W"] },
                        { name: "backward", keys: ["ArrowDown", "s", "S"] },
                        { name: "left", keys: ["ArrowLeft", "a", "A"] },
                        { name: "right", keys: ["ArrowRight", "d", "D"] },
                    ]}
                >
                    {/* Warm, Cozy Lighting Setup */}
                    <color attach="background" args={['#FDF6E3']} />
                    
                    {/* Sky/Ground Hemisphere for soft ambient fill */}
                    <hemisphereLight args={['#FFF8E1', '#D7CCC8', 0.6]} />
                    
                    {/* Main Sunlight - warmer and softer */}
                    <directionalLight 
                        castShadow 
                        position={[5, 8, 5]} 
                        intensity={0.8} 
                        color="#FFECB3"
                        shadow-mapSize={[1024, 1024]} 
                        shadow-bias={-0.0001}
                    />

                    {/* Environment reflection */}
                    <Suspense fallback={null}>
                         <Environment preset="sunset" blur={0.8} />
                    </Suspense>

                    {/* Grounding Contact Shadows */}
                    <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={20} blur={2.5} far={4.5} />
                    
                    {/* Room Floor */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                        <planeGeometry args={[100, 100]} />
                        <meshStandardMaterial color="#FFF3E0" />
                    </mesh>

                    {/* Objects */}
                    <Podium isNear={interactionTarget?.type === 'podium'} />
                    
                    {students.map(student => (
                        <StudentModel 
                            key={student.id} 
                            student={student} 
                            isInteracting={interactionTarget?.type === 'student' && interactionTarget.id === student.id}
                        />
                    ))}

                    <PlayerController />
                    <CameraController />
                </KeyboardControls>
            </Canvas>
        </div>
    );
};