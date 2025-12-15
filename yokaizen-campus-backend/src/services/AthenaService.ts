// Yokaizen Campus - Athena Service
// Teacher Insights & Classroom Analytics

import { prisma } from '../utils/prisma.js';
import { classroomCache } from '../utils/redis.js';
import { calculateVelocity, clamp } from '../utils/helpers.js';
import { createAIEngine } from './AiEngine.js';
import {
  AthenaInsight,
  AthenaAlert,
  AthenaTrend,
  StudentLiveStatus,
  ClassroomAggregates,
  GraphStatus,
} from '../types/index.js';

// Generate classroom insights using AI
async function generateAISummary(
  aggregates: ClassroomAggregates,
  alerts: AthenaAlert[]
): Promise<{ summary: string; suggestedAction: string }> {
  // Use mock response for now (can be replaced with actual AI call)
  const summaries: Record<string, { summary: string; suggestedAction: string }> = {
    excellent: {
      summary: 'Class is performing exceptionally well. Most students are in flow state with high engagement.',
      suggestedAction: 'Consider introducing a challenging bonus task or chaos event to maintain momentum.',
    },
    good: {
      summary: 'Classroom is progressing steadily. Engagement levels are healthy.',
      suggestedAction: 'Keep monitoring and provide encouragement to maintain the positive trajectory.',
    },
    needsAttention: {
      summary: 'Several students appear to be struggling. Consider providing additional guidance.',
      suggestedAction: 'Broadcast a helpful hint or check in with students who have raised their hands.',
    },
    struggling: {
      summary: 'Class is facing challenges. Many students are stuck or showing low sentiment.',
      suggestedAction: 'Pause and provide a group explanation or demonstration. Consider simplifying the current task.',
    },
    idle: {
      summary: 'Low activity detected in the classroom.',
      suggestedAction: 'Check if students need help getting started or if there are technical issues.',
    },
  };

  // Determine state based on aggregates
  let state = 'good';

  if (aggregates.idleCount > aggregates.totalStudents * 0.5) {
    state = 'idle';
  } else if (aggregates.stuckCount > aggregates.totalStudents * 0.4) {
    state = 'struggling';
  } else if (aggregates.stuckCount > aggregates.totalStudents * 0.2) {
    state = 'needsAttention';
  } else if (aggregates.velocity > 80 && aggregates.averageSentiment > 70) {
    state = 'excellent';
  }

  // Add alert-specific context
  if (alerts.some(a => a.type === 'sentiment_drop' && a.severity === 'high')) {
    return {
      summary: 'Significant sentiment drop detected. Some students may be frustrated or confused.',
      suggestedAction: 'Consider a brief break or encouraging message to reset the mood.',
    };
  }

  return summaries[state];
}

// Analyze student graph complexity
function analyzeGraphComplexity(
  nodes: unknown[],
  connections: unknown[]
): { complexity: 'simple' | 'moderate' | 'complex' | 'chaotic'; score: number } {
  const nodeCount = Array.isArray(nodes) ? nodes.length : 0;
  const connectionCount = Array.isArray(connections) ? connections.length : 0;

  // Calculate complexity score
  const ratio = nodeCount > 0 ? connectionCount / nodeCount : 0;
  const score = (nodeCount * 10) + (connectionCount * 5) + (ratio * 20);

  if (nodeCount === 0) {
    return { complexity: 'simple', score: 0 };
  }
  if (score < 30) {
    return { complexity: 'simple', score };
  }
  if (score < 80) {
    return { complexity: 'moderate', score };
  }
  if (score < 150) {
    return { complexity: 'complex', score };
  }
  return { complexity: 'chaotic', score };
}

// Detect patterns and generate alerts
function detectAlerts(
  students: StudentLiveStatus[],
  previousAggregates?: ClassroomAggregates
): AthenaAlert[] {
  const alerts: AthenaAlert[] = [];

  // Check for stuck cluster
  const stuckStudents = students.filter(s => s.status === 'STUCK');
  if (stuckStudents.length >= 3) {
    alerts.push({
      type: 'stuck_cluster',
      message: `${stuckStudents.length} students are stuck. They may be facing a common obstacle.`,
      affectedStudents: stuckStudents.map(s => s.id),
      severity: stuckStudents.length >= 5 ? 'high' : 'medium',
    });
  }

  // Check for sentiment drop
  const lowSentimentStudents = students.filter(s => s.sentimentScore < 40);
  if (lowSentimentStudents.length >= 2) {
    alerts.push({
      type: 'sentiment_drop',
      message: 'Low sentiment detected among multiple students.',
      affectedStudents: lowSentimentStudents.map(s => s.id),
      severity: lowSentimentStudents.length >= 4 ? 'high' : 'medium',
    });
  }

  // Check for idle students
  const idleStudents = students.filter(s => s.status === 'IDLE');
  if (idleStudents.length > students.length * 0.3 && idleStudents.length >= 2) {
    alerts.push({
      type: 'idle_students',
      message: `${idleStudents.length} students appear inactive.`,
      affectedStudents: idleStudents.map(s => s.id),
      severity: 'low',
    });
  }

  // Check for complexity issues (if we had access to graph data)
  // This would be enhanced with actual graph analysis

  return alerts;
}

// Calculate trends by comparing current to previous state
function calculateTrends(
  current: ClassroomAggregates,
  previous?: ClassroomAggregates
): AthenaTrend[] {
  const trends: AthenaTrend[] = [];

  if (!previous) {
    return [
      { metric: 'velocity', direction: 'stable', change: 0 },
      { metric: 'sentiment', direction: 'stable', change: 0 },
      { metric: 'engagement', direction: 'stable', change: 0 },
    ];
  }

  // Velocity trend
  const velocityChange = current.velocity - previous.velocity;
  trends.push({
    metric: 'velocity',
    direction: velocityChange > 5 ? 'up' : velocityChange < -5 ? 'down' : 'stable',
    change: velocityChange,
  });

  // Sentiment trend
  const sentimentChange = current.averageSentiment - previous.averageSentiment;
  trends.push({
    metric: 'sentiment',
    direction: sentimentChange > 5 ? 'up' : sentimentChange < -5 ? 'down' : 'stable',
    change: sentimentChange,
  });

  // Engagement (flow + stuck vs idle)
  const currentEngagement = ((current.flowCount + current.stuckCount) / Math.max(current.totalStudents, 1)) * 100;
  const previousEngagement = ((previous.flowCount + previous.stuckCount) / Math.max(previous.totalStudents, 1)) * 100;
  const engagementChange = currentEngagement - previousEngagement;
  trends.push({
    metric: 'engagement',
    direction: engagementChange > 10 ? 'up' : engagementChange < -10 ? 'down' : 'stable',
    change: engagementChange,
  });

  return trends;
}

// Main Athena service class
export class AthenaService {
  constructor() { }

  // Get live student statuses from Redis
  async getStudentStatuses(classroomId: string): Promise<StudentLiveStatus[]> {
    const redisData = await classroomCache.getStudentStatuses(classroomId);
    const handsData = await classroomCache.getRaisedHands(classroomId);

    // Get student details from database
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        students: {
          include: {
            student: {
              select: { id: true, fullName: true },
            },
          },
        },
        school: {
          select: { anonymizeStudents: true },
        },
      },
    });

    if (!classroom) {
      return [];
    }

    const anonymize = classroom.school?.anonymizeStudents || false;

    // Merge Redis data with student info
    const statuses: StudentLiveStatus[] = [];

    for (const enrollment of classroom.students) {
      const studentId = enrollment.studentId;
      const redisStatus = redisData[studentId] as {
        status?: string;
        sentiment?: number;
        nodeCount?: number;
        lastUpdate?: number;
      } | undefined;

      const handStatus = handsData[studentId] as { raised?: boolean } | undefined;

      statuses.push({
        id: studentId,
        displayName: anonymize ? enrollment.anonymousId : enrollment.student.fullName,
        status: (redisStatus?.status as GraphStatus) || 'IDLE',
        sentimentScore: redisStatus?.sentiment || 50,
        nodeCount: redisStatus?.nodeCount || 0,
        lastUpdate: new Date(redisStatus?.lastUpdate || Date.now()),
        raisedHand: handStatus?.raised || false,
      });
    }

    return statuses;
  }

  // Calculate classroom aggregates
  calculateAggregates(students: StudentLiveStatus[]): ClassroomAggregates {
    const total = students.length;

    if (total === 0) {
      return {
        totalStudents: 0,
        flowCount: 0,
        stuckCount: 0,
        idleCount: 0,
        averageSentiment: 50,
        velocity: 0,
      };
    }

    const flowCount = students.filter(s => s.status === 'FLOW').length;
    const stuckCount = students.filter(s => s.status === 'STUCK').length;
    const idleCount = students.filter(s => s.status === 'IDLE').length;
    const averageSentiment = Math.round(
      students.reduce((sum, s) => sum + s.sentimentScore, 0) / total
    );

    const velocity = calculateVelocity(flowCount, stuckCount, idleCount, averageSentiment);

    return {
      totalStudents: total,
      flowCount,
      stuckCount,
      idleCount,
      averageSentiment,
      velocity,
    };
  }

  // Generate full Athena insight
  async generateInsight(classroomId: string, previousAggregates?: ClassroomAggregates): Promise<AthenaInsight> {
    const students = await this.getStudentStatuses(classroomId);
    const aggregates = this.calculateAggregates(students);
    const alerts = detectAlerts(students, previousAggregates);
    const trends = calculateTrends(aggregates, previousAggregates);

    // Get AI-generated summary
    const { summary, suggestedAction } = await generateAISummary(aggregates, alerts);

    // Store current aggregates for future trend calculation
    // this.previousAggregates = aggregates; // Stateless service cannot store this.

    return {
      velocity: aggregates.velocity,
      summary,
      suggestedAction,
      alerts,
      trends,
    };
  }

  // Get quick heatmap data (optimized for polling)
  async getHeatmapData(classroomId: string): Promise<{
    students: Array<{
      id: string;
      displayName: string;
      status: GraphStatus;
      sentiment: number;
      raisedHand: boolean;
    }>;
    aggregates: ClassroomAggregates;
  }> {
    const students = await this.getStudentStatuses(classroomId);
    const aggregates = this.calculateAggregates(students);

    return {
      students: students.map(s => ({
        id: s.id,
        displayName: s.displayName,
        status: s.status,
        sentiment: s.sentimentScore,
        raisedHand: s.raisedHand,
      })),
      aggregates,
    };
  }

  // Analyze student graph sessions
  async analyzeGraphSessions(classroomId: string): Promise<{
    complexityDistribution: Record<string, number>;
    averageNodeCount: number;
    averageConnections: number;
    recommendations: string[];
  }> {
    const sessions = await prisma.graphSession.findMany({
      where: { classroomId },
      select: { nodes: true, connections: true },
    });

    const complexities = { simple: 0, moderate: 0, complex: 0, chaotic: 0 };
    let totalNodes = 0;
    let totalConnections = 0;

    for (const session of sessions) {
      const nodes = session.nodes as unknown[];
      const connections = session.connections as unknown[];

      const analysis = analyzeGraphComplexity(nodes, connections);
      complexities[analysis.complexity]++;
      totalNodes += Array.isArray(nodes) ? nodes.length : 0;
      totalConnections += Array.isArray(connections) ? connections.length : 0;
    }

    const sessionCount = Math.max(sessions.length, 1);

    // Generate recommendations
    const recommendations: string[] = [];

    if (complexities.simple > sessionCount * 0.5) {
      recommendations.push('Many graphs are simple. Consider encouraging students to explore more complex workflows.');
    }
    if (complexities.chaotic > sessionCount * 0.2) {
      recommendations.push('Some graphs are overly complex. Consider teaching workflow optimization techniques.');
    }
    if (totalNodes / sessionCount < 3) {
      recommendations.push('Average node count is low. Students may need help understanding available agent types.');
    }

    return {
      complexityDistribution: complexities,
      averageNodeCount: Math.round(totalNodes / sessionCount),
      averageConnections: Math.round(totalConnections / sessionCount),
      recommendations,
    };
  }
}

// Factory function
export function createAthenaService(classroomId: string): AthenaService {
  return new AthenaService();
}

// Aggregate insights for a school (admin view)
export async function getSchoolInsights(schoolId: string): Promise<{
  totalClassrooms: number;
  activeClassrooms: number;
  totalStudents: number;
  averageVelocity: number;
  topPerformingClassrooms: Array<{ id: string; name: string; velocity: number }>;
}> {
  const classrooms = await prisma.classroom.findMany({
    where: { schoolId },
    include: {
      _count: { select: { students: true } },
    },
  });

  const velocities: Array<{ id: string; name: string; velocity: number }> = [];

  for (const classroom of classrooms) {
    const athena = createAthenaService(classroom.id);
    const students = await athena.getStudentStatuses(classroom.id);
    const aggregates = athena.calculateAggregates(students);

    velocities.push({
      id: classroom.id,
      name: classroom.name,
      velocity: aggregates.velocity,
    });
  }

  velocities.sort((a, b) => b.velocity - a.velocity);

  return {
    totalClassrooms: classrooms.length,
    activeClassrooms: classrooms.filter((c: any) => c.isActive).length,
    totalStudents: classrooms.reduce((sum: number, c: any) => sum + (c._count?.students || 0), 0),
    averageVelocity: velocities.length > 0
      ? Math.round(velocities.reduce((sum: number, v: any) => sum + v.velocity, 0) / velocities.length)
      : 0,
    topPerformingClassrooms: velocities.slice(0, 5),
  };
}

// Export singleton instance
export const athenaService = new AthenaService();

