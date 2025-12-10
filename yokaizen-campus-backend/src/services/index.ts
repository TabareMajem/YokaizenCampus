import { AIEngine } from './AiEngine';
import { AthenaService } from './AthenaService';
import { AuthService } from './AuthService';
import { ClassroomService } from './ClassroomService';
import { GamificationService } from './GamificationService';
import { GraphService } from './GraphService';
import { GrantService } from './GrantService';
import { ParentService } from './ParentService';
import { PaymentService } from './PaymentService';

// Export classes
export { AIEngine } from './AiEngine';
export { AthenaService } from './AthenaService';
export { AuthService } from './AuthService';
export { ClassroomService } from './ClassroomService';
export { GamificationService } from './GamificationService';
export { GraphService } from './GraphService';
export { GrantService } from './GrantService';
export { ParentService } from './ParentService';
export { PaymentService } from './PaymentService';

// Export singleton instances
export const aiEngine = new AIEngine();
export const athenaService = new AthenaService();
export const authService = new AuthService();
export const classroomService = new ClassroomService();
export const gamificationService = new GamificationService();
export const graphService = new GraphService();
export const grantService = new GrantService();
export const parentService = new ParentService();
export const paymentService = new PaymentService();
