"use client";

import { useEffect, useState, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, useTexture } from '@react-three/drei';
import styles from './landing.module.css';

// 企鹅模型组件
function PenguinModel({ scrollProgress }) {
  const groupRef = useRef();
  const { scene } = useGLTF('/penguin.glb', true);
  
  useFrame((state) => {
    if (groupRef.current) {
      // 从左上到右下的移动 - 增加移动幅度
      groupRef.current.position.x = -8 + scrollProgress * 16; // 更大的水平移动范围
      groupRef.current.position.y = 3 - scrollProgress * 6;  // 更大的垂直移动范围
      
      // 头部朝向滑动方向
      groupRef.current.rotation.y = Math.PI / 4 - scrollProgress * (Math.PI / 2); // 旋转朝向运动方向
      
      // 添加更快的滑动动画
      groupRef.current.position.y += Math.sin(state.clock.elapsedTime * 4) * 0.05; // 更快的上下摆动
      
      // 轻微的倾斜，滑冰效果
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 5) * 0.08;
    }
  });
  
  return (
    <group ref={groupRef} position={[-8, 3, 0]} scale={[0.5, 0.5, 0.5]} rotation={[0, Math.PI / 4, 0]}>
      <primitive object={scene} />
    </group>
  );
}

// 备用企鹅组件（使用基本几何体）
function FallbackPenguin({ scrollProgress }) {
  const groupRef = useRef();
  
  useFrame((state) => {
    if (groupRef.current) {
      // 从左上到右下的移动 - 增加移动幅度
      groupRef.current.position.x = -8 + scrollProgress * 16; // 更大的水平移动范围
      groupRef.current.position.y = 3 - scrollProgress * 6;  // 更大的垂直移动范围
      
      // 头部朝向滑动方向
      groupRef.current.rotation.y = Math.PI / 4 - scrollProgress * (Math.PI / 2); // 旋转朝向运动方向
      
      // 添加更快的滑动动画
      groupRef.current.position.y += Math.sin(state.clock.elapsedTime * 4) * 0.05; // 更快的上下摆动
      
      // 轻微的倾斜，滑冰效果
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 5) * 0.08;
    }
  });
  
  return (
    <group ref={groupRef} position={[-8, 3, 0]} scale={[0.5, 0.5, 0.5]} rotation={[0, Math.PI / 4, 0]}>
      {/* 身体 - 稍微拉长的球体 */}
      <mesh scale={[1, 1.2, 0.8]}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshLambertMaterial color="#222222" />
      </mesh>
      
      {/* 白色肚子 */}
      <mesh position={[0, -0.05, 0.2]} scale={[0.8, 1, 0.7]}>
        <sphereGeometry args={[0.75, 32, 32]} />
        <meshLambertMaterial color="#FFFFFF" />
      </mesh>
      
      {/* 头部 */}
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshLambertMaterial color="#222222" />
      </mesh>
      
      {/* 橙色喙 */}
      <mesh position={[0, 0.9, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.1, 0.3, 32]} />
        <meshLambertMaterial color="#FF8C00" />
      </mesh>
      
      {/* 眼睛 */}
      <mesh position={[0.15, 1, 0.35]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      
      <mesh position={[-0.15, 1, 0.35]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      
      {/* 瞳孔 */}
      <mesh position={[0.15, 1, 0.38]}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      
      <mesh position={[-0.15, 1, 0.38]}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      
      {/* 翅膀 */}
      <mesh position={[0.8, 0.2, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.1, 0.7, 0.3]} />
        <meshLambertMaterial color="#222222" />
      </mesh>
      
      <mesh position={[-0.8, 0.2, 0]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.1, 0.7, 0.3]} />
        <meshLambertMaterial color="#222222" />
      </mesh>
      
      {/* 脚 */}
      <mesh position={[0.3, -1.1, 0.2]}>
        <boxGeometry args={[0.3, 0.1, 0.5]} />
        <meshLambertMaterial color="#FF8C00" />
      </mesh>
      
      <mesh position={[-0.3, -1.1, 0.2]}>
        <boxGeometry args={[0.3, 0.1, 0.5]} />
        <meshLambertMaterial color="#FF8C00" />
      </mesh>
    </group>
  );
}

// 图片贴图企鹅备用组件
function TexturePenguin({ scrollProgress }) {
  const groupRef = useRef();
  const texture = useTexture('/pengy.webp');
  
  useFrame((state) => {
    if (groupRef.current) {
      // 从左上到右下的移动 - 增加移动幅度
      groupRef.current.position.x = -8 + scrollProgress * 16; // 更大的水平移动范围
      groupRef.current.position.y = 3 - scrollProgress * 6;  // 更大的垂直移动范围
      
      // 头部朝向滑动方向
      groupRef.current.rotation.y = Math.PI / 4 - scrollProgress * (Math.PI / 2); // 旋转朝向运动方向
      
      // 添加更快的滑动动画
      groupRef.current.position.y += Math.sin(state.clock.elapsedTime * 4) * 0.05; // 更快的上下摆动
      
      // 轻微的倾斜，滑冰效果
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 5) * 0.08;
    }
  });
  
  return (
    <group ref={groupRef} position={[-8, 3, 0]} rotation={[0, Math.PI / 4, 0]}>
      <mesh>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial map={texture} transparent={true} />
      </mesh>
    </group>
  );
}

// 错误边界组件
function ErrorBoundary({ children, fallback }) {
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    const errorHandler = (error) => {
      console.error(error);
      setHasError(true);
    };
    
    window.addEventListener('error', errorHandler);
    
    return () => {
      window.removeEventListener('error', errorHandler);
    };
  }, []);
  
  if (hasError) {
    return fallback;
  }
  
  return children;
}

// Scene组件
function Scene({ scrollProgress }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[1, 1, 1]} intensity={1} />
      
      <ErrorBoundary fallback={<FallbackPenguin scrollProgress={scrollProgress} />}>
        <Suspense fallback={<TexturePenguin scrollProgress={scrollProgress} />}>
          <PenguinModel scrollProgress={scrollProgress} />
        </Suspense>
      </ErrorBoundary>
    </>
  );
}

export default function LandingPage() {
  const [scrollProgress, setScrollProgress] = useState(0);
  
  useEffect(() => {
    // 检查是否是客户端
    if (typeof window === 'undefined') return;
    
    // 处理滚动 - 调整滚动速度响应
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      // 加快滚动进度变化速度，使用非线性映射
      let progress = window.scrollY / scrollHeight;
      // 非线性映射，让企鹅在页面前半部分就能完成大部分移动
      progress = Math.pow(progress, 0.7); // 使滚动初期移动更快
      setScrollProgress(Math.min(progress, 1));
    };
    
    window.addEventListener('scroll', handleScroll);
    
    // 初始化滚动位置
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  return (
    <div className={styles.landingContainer}>
      <div className={styles.threeContainer}>
        <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
          <Scene scrollProgress={scrollProgress} />
        </Canvas>
      </div>
      
      <section className={styles.section}>
        <h1>欢迎使用我们的项目管理系统</h1>
        <p>高效协作，轻松管理，成就卓越项目</p>
      </section>
      
      <section className={styles.section}>
        <h2>功能特点</h2>
        <p>先进的任务分配和跟踪系统，让团队协作更加高效</p>
      </section>
      
      <section className={styles.section}>
        <h2>为什么选择我们</h2>
        <p>简洁直观的界面，强大的分析功能，灵活的自定义选项</p>
      </section>
      
      <section className={styles.section}>
        <h2>客户评价</h2>
        <p>超过500家企业正在使用我们的系统，提高生产力和项目成功率</p>
      </section>
    </div>
  );
}
