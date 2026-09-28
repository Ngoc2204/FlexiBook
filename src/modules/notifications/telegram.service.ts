import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendMessage(botToken?: string | null, chatId?: string | null, message?: string): Promise<boolean> {
    const token = botToken || this.configService.get<string>('telegram.botToken');
    const targetChatId = chatId || this.configService.get<string>('telegram.chatId');

    if (!token || !targetChatId || !message) {
      this.logger.debug('Telegram credentials not configured. Skipping message dispatch.');
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`Telegram API error: ${response.status} - ${errorText}`);
        return false;
      }

      this.logger.log(`Telegram message sent successfully to chat: ${targetChatId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending Telegram message: ${(error as Error).message}`);
      throw error; // Re-throw so BullMQ can trigger retry
    }
  }
}
