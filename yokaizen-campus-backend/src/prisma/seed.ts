import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ============================================
  // Create Schools
  // ============================================
  console.log('📚 Creating schools...');
  
  const demoSchool = await prisma.school.upsert({
    where: { id: 'school-demo-001' },
    update: {},
    create: {
      id: 'school-demo-001',
      name: 'Yokaizen Demo Academy',
      domain: 'demo.yokaizen.edu',
      subscriptionTier: 'PRO',
      maxStudents: 500,
      maxTeachers: 50,
      credits: 100000
    }
  });

  const freeSchool = await prisma.school.upsert({
    where: { id: 'school-free-001' },
    update: {},
    create: {
      id: 'school-free-001',
      name: 'Yokaizen Free School',
      domain: 'free.yokaizen.edu',
      subscriptionTier: 'FREE',
      maxStudents: 100,
      maxTeachers: 10,
      credits: 10000
    }
  });

  console.log(`  ✅ Created ${demoSchool.name}`);
  console.log(`  ✅ Created ${freeSchool.name}`);

  // ============================================
  // Create Users
  // ============================================
  console.log('\n👥 Creating users...');

  const hashedPassword = await bcrypt.hash('demo123456', 12);

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@yokaizen.com' },
    update: {},
    create: {
      email: 'admin@yokaizen.com',
      passwordHash: hashedPassword,
      fullName: 'System Admin',
      role: 'ADMIN',
      subscriptionTier: 'PRO',
      credits: 999999,
      level: 99,
      xp: 999999,
      philosophyMode: 'JAPAN'
    }
  });

  // Demo Teacher
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@demo.yokaizen.edu' },
    update: {},
    create: {
      email: 'teacher@demo.yokaizen.edu',
      passwordHash: hashedPassword,
      fullName: 'Professor Tanaka',
      role: 'TEACHER',
      schoolId: demoSchool.id,
      subscriptionTier: 'PRO',
      credits: 50000,
      level: 25,
      xp: 12500,
      philosophyMode: 'JAPAN'
    }
  });

  // Demo Students
  const students = [];
  const studentData = [
    { name: 'Alex Chen', email: 'alex@demo.yokaizen.edu', philosophy: 'KOREA' },
    { name: 'Yuki Yamamoto', email: 'yuki@demo.yokaizen.edu', philosophy: 'JAPAN' },
    { name: 'Emma Johnson', email: 'emma@demo.yokaizen.edu', philosophy: 'FINLAND' },
    { name: 'Kenji Sato', email: 'kenji@demo.yokaizen.edu', philosophy: 'JAPAN' },
    { name: 'Sofia Martinez', email: 'sofia@demo.yokaizen.edu', philosophy: 'KOREA' },
  ];

  for (const data of studentData) {
    const student = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        email: data.email,
        passwordHash: hashedPassword,
        fullName: data.name,
        role: 'STUDENT',
        schoolId: demoSchool.id,
        subscriptionTier: 'FREE',
        credits: 500,
        level: Math.floor(Math.random() * 10) + 1,
        xp: Math.floor(Math.random() * 5000),
        philosophyMode: data.philosophy as any
      }
    });
    students.push(student);
  }

  // Demo Parent
  const parent = await prisma.user.upsert({
    where: { email: 'parent@demo.yokaizen.edu' },
    update: {},
    create: {
      email: 'parent@demo.yokaizen.edu',
      passwordHash: hashedPassword,
      fullName: 'Parent Chen',
      role: 'PARENT',
      subscriptionTier: 'FREE',
      credits: 1000,
      philosophyMode: 'JAPAN'
    }
  });

  console.log(`  ✅ Created admin: ${admin.email}`);
  console.log(`  ✅ Created teacher: ${teacher.email}`);
  console.log(`  ✅ Created ${students.length} students`);
  console.log(`  ✅ Created parent: ${parent.email}`);

  // ============================================
  // Create Career Paths for Students
  // ============================================
  console.log('\n🎯 Creating career paths...');

  for (const student of students) {
    const level = student.level;
    const unlockedNodes = ['SCOUT'];
    
    if (level >= 3) unlockedNodes.push('CREATIVE');
    if (level >= 5) unlockedNodes.push('CRITIC');
    if (level >= 6) unlockedNodes.push('ANALYST');
    if (level >= 7) unlockedNodes.push('DEBUGGER');
    if (level >= 8) unlockedNodes.push('ETHICIST');
    if (level >= 10) unlockedNodes.push('ARCHITECT');

    await prisma.careerPath.upsert({
      where: { userId: student.id },
      update: { unlockedNodes },
      create: {
        userId: student.id,
        unlockedNodes,
        stats: {
          orchestration: Math.floor(Math.random() * 50) + 10,
          resilience: Math.floor(Math.random() * 50) + 10,
          creativity: Math.floor(Math.random() * 50) + 10,
          logic: Math.floor(Math.random() * 50) + 10,
          ethics: Math.floor(Math.random() * 50) + 10
        }
      }
    });
  }

  console.log(`  ✅ Created career paths for ${students.length} students`);

  // ============================================
  // Create Demo Classroom
  // ============================================
  console.log('\n🏫 Creating classrooms...');

  const classroom = await prisma.classroom.upsert({
    where: { id: 'classroom-demo-001' },
    update: {},
    create: {
      id: 'classroom-demo-001',
      teacherId: teacher.id,
      name: 'Introduction to AI Workflows',
      accessCode: 'DEMO01',
      currentPhilosophy: 'JAPAN',
      isActive: true,
      maxStudents: 30,
      anonymizeStudents: true
    }
  });

  // Add students to classroom
  for (const student of students) {
    await prisma.classroomStudent.upsert({
      where: {
        classroomId_studentId: {
          classroomId: classroom.id,
          studentId: student.id
        }
      },
      update: {},
      create: {
        classroomId: classroom.id,
        studentId: student.id,
        anonymousId: `Cadet-${Math.floor(Math.random() * 900) + 100}`
      }
    });
  }

  console.log(`  ✅ Created classroom: ${classroom.name}`);
  console.log(`  ✅ Added ${students.length} students to classroom`);

  // ============================================
  // Create AR Markers
  // ============================================
  console.log('\n🎮 Creating AR markers...');

  const arMarkers = [
    {
      codeContent: 'YOKAIZEN-ORACLE-001',
      unlocksAgent: 'ORACLE',
      loreText: 'In the depths of the server room, you discover an ancient terminal. Its screen flickers to life, revealing The Oracle - a prophetic AI that sees patterns others miss.',
      xpReward: 200,
      isOneTime: false
    },
    {
      codeContent: 'YOKAIZEN-ETHICIST-001',
      unlocksAgent: 'ETHICIST',
      loreText: 'Hidden behind the ethics board, you find a glowing shard of conscience. The Ethicist emerges, guardian of moral reasoning and detector of bias.',
      xpReward: 150,
      isOneTime: false
    },
    {
      codeContent: 'YOKAIZEN-BONUS-XP-001',
      unlocksAgent: '',
      loreText: 'A hidden cache of experience points! Your dedication has been rewarded.',
      xpReward: 500,
      isOneTime: true
    }
  ];

  for (const marker of arMarkers) {
    await prisma.aRMarker.upsert({
      where: { codeContent: marker.codeContent },
      update: {},
      create: {
        ...marker,
        isActive: true,
        createdBy: admin.id
      }
    });
  }

  console.log(`  ✅ Created ${arMarkers.length} AR markers`);

  // ============================================
  // Create Sample Graph Sessions
  // ============================================
  console.log('\n📊 Creating sample graph sessions...');

  for (const student of students.slice(0, 3)) {
    await prisma.graphSession.create({
      data: {
        userId: student.id,
        classroomId: classroom.id,
        nodes: JSON.stringify([
          { id: 'node-1', type: 'SCOUT', position: { x: 100, y: 100 }, data: { label: 'Research Task' } },
          { id: 'node-2', type: 'ARCHITECT', position: { x: 300, y: 100 }, data: { label: 'Structure Data' } },
          { id: 'node-3', type: 'CRITIC', position: { x: 500, y: 100 }, data: { label: 'Verify Output' } }
        ]),
        connections: JSON.stringify([
          { id: 'edge-1', source: 'node-1', target: 'node-2' },
          { id: 'edge-2', source: 'node-2', target: 'node-3' }
        ]),
        status: ['FLOW', 'STUCK', 'IDLE'][Math.floor(Math.random() * 3)] as any,
        sentimentScore: Math.floor(Math.random() * 40) + 60
      }
    });
  }

  console.log(`  ✅ Created sample graph sessions`);

  // ============================================
  // Create Parent-Child Link
  // ============================================
  console.log('\n👨‍👧 Creating parent-child links...');

  await prisma.parentChild.upsert({
    where: {
      parentId_childId: {
        parentId: parent.id,
        childId: students[0].id
      }
    },
    update: {},
    create: {
      parentId: parent.id,
      childId: students[0].id,
      relationshipType: 'PARENT',
      isVerified: true
    }
  });

  console.log(`  ✅ Linked ${parent.fullName} to ${students[0].fullName}`);

  // ============================================
  // Create Sample Audit Logs
  // ============================================
  console.log('\n📝 Creating sample audit logs...');

  const actions = [
    { type: 'GRAPH_EXECUTE', details: 'Executed graph workflow' },
    { type: 'LEVEL_UP', details: 'Reached level 5' },
    { type: 'ACHIEVEMENT_UNLOCKED', details: 'Unlocked Graph Pioneer achievement' },
    { type: 'CLASSROOM_JOINED', details: 'Joined Introduction to AI Workflows' },
    { type: 'AR_SCAN', details: 'Scanned AR marker' }
  ];

  for (const student of students) {
    for (const action of actions.slice(0, Math.floor(Math.random() * 3) + 1)) {
      await prisma.auditLog.create({
        data: {
          userId: student.id,
          actionType: action.type,
          details: action.details,
          meta: { source: 'seed' }
        }
      });
    }
  }

  console.log(`  ✅ Created sample audit logs`);

  // ============================================
  // Summary
  // ============================================
  console.log('\n' + '═'.repeat(50));
  console.log('🎉 Database seeding completed successfully!\n');
  console.log('Demo Accounts:');
  console.log('─'.repeat(50));
  console.log('Admin:    admin@yokaizen.com / demo123456');
  console.log('Teacher:  teacher@demo.yokaizen.edu / demo123456');
  console.log('Student:  alex@demo.yokaizen.edu / demo123456');
  console.log('Parent:   parent@demo.yokaizen.edu / demo123456');
  console.log('─'.repeat(50));
  console.log('Classroom Access Code: DEMO01');
  console.log('═'.repeat(50) + '\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
