import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  path: '/api/chat',
  cors: {
    origin: ['http://localhost:5173'], // ضف دوميناتك هنا
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  handleConnection(client: Socket) {
    const { sessionId, role } = client.handshake.query;
    if (sessionId) {
      client.join(sessionId as string);
    }
    // إذا متصل كمدير أو مشرف، يدخل غرفة المشرفين
    if (role === 'admin' || role === 'agent') {
      client.join('admin');
      console.log('Admin/Agent joined admin room:', client.id);
    }
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected', client.id);
  }

  sendMessageToSession(sessionId: string, message: any) {
    this.server.to(sessionId).emit('message', message); // للعميل نفسه
    this.server.to('admin').emit('admin_new_message', { sessionId, message }); // بث للمشرفين
  }
}
