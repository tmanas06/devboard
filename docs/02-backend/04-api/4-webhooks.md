# Webhooks

## Overview

Currently, the Time Entry API does not implement custom webhooks. However, it leverages Clerk's webhook system for user authentication events.

## Clerk Webhooks

The application uses Clerk webhooks to sync user data between Clerk and the application database.

### Supported Clerk Events

The following Clerk events are typically handled:

1. **user.created** - When a new user signs up via Clerk
2. **user.updated** - When user profile is updated in Clerk
3. **user.deleted** - When user is deleted from Clerk

### Webhook Configuration

#### Clerk Dashboard Setup

1. Navigate to Clerk Dashboard > Webhooks
2. Create a new endpoint
3. Set endpoint URL: `https://your-api.com/webhooks/clerk`
4. Select events to subscribe to
5. Copy the signing secret for verification

#### Environment Variables

Add Clerk webhook secret to your environment:

```bash
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Implementation Pattern

Though not currently implemented, here's the recommended pattern for Clerk webhooks:

**Webhook Controller (Example):**

```typescript
import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { Webhook } from 'svix';

@Controller('webhooks/clerk')
export class ClerkWebhookController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async handleClerkWebhook(
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
    @Body() payload: any,
  ) {
    // Verify webhook signature
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    const webhook = new Webhook(webhookSecret);

    try {
      const event = webhook.verify(
        JSON.stringify(payload),
        {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        },
      );

      // Handle different event types
      switch (event.type) {
        case 'user.created':
          await this.handleUserCreated(event.data);
          break;
        case 'user.updated':
          await this.handleUserUpdated(event.data);
          break;
        case 'user.deleted':
          await this.handleUserDeleted(event.data);
          break;
      }

      return { received: true };
    } catch (error) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  private async handleUserCreated(data: any) {
    // Sync user to database
    await this.usersService.create({
      clerkId: data.id,
      email: data.email_addresses[0].email_address,
      firstName: data.first_name,
      lastName: data.last_name,
    });
  }

  private async handleUserUpdated(data: any) {
    // Update user in database
    await this.usersService.updateByClerkId(data.id, {
      email: data.email_addresses[0].email_address,
      firstName: data.first_name,
      lastName: data.last_name,
    });
  }

  private async handleUserDeleted(data: any) {
    // Soft delete or hard delete user
    await this.usersService.deleteByClerkId(data.id);
  }
}
```

## Future Custom Webhooks

The following custom webhook endpoints could be implemented in the future:

### Potential Webhook Events

1. **time_entry.created** - Notify when a new time entry is logged
2. **time_entry.updated** - Notify when a time entry is modified
3. **time_entry.deleted** - Notify when a time entry is deleted
4. **task.created** - Notify when a new task is created
5. **task.updated** - Notify when a task is updated
6. **task.status_changed** - Notify when task status changes
7. **organization.member_added** - Notify when a user joins an organization
8. **organization.member_removed** - Notify when a user leaves an organization

### Webhook Payload Format

Future custom webhooks would follow this format:

```json
{
  "id": "webhook_event_id",
  "type": "time_entry.created",
  "createdAt": "2025-01-07T12:00:00.000Z",
  "data": {
    "id": "entry_cuid123",
    "organizationId": "org_cuid123",
    "userId": "user_cuid123",
    "hours": 4,
    "startTime": "2025-01-07T09:00:00.000Z",
    "endTime": "2025-01-07T13:00:00.000Z",
    "description": "Worked on authentication"
  },
  "organizationId": "org_cuid123"
}
```

### Webhook Security

Future webhooks should implement:

1. **Signature Verification** - HMAC-SHA256 signature using secret key
2. **Timestamp Validation** - Reject events older than 5 minutes
3. **Idempotency** - Use unique event ID to prevent duplicate processing
4. **HTTPS Only** - Only deliver to HTTPS endpoints
5. **Retry Logic** - Retry failed deliveries with exponential backoff

### Implementation Libraries

For webhook implementation, consider using:

- **svix** - For webhook delivery and signature verification
- **@nestjs/event-emitter** - For internal event system
- **bull** - For queued webhook delivery with retry logic

## Webhook Best Practices

### For Webhook Consumers

1. **Verify Signatures** - Always verify webhook signatures
2. **Acknowledge Quickly** - Return 200 OK within 5 seconds
3. **Process Async** - Queue webhook events for async processing
4. **Idempotency** - Handle duplicate events gracefully
5. **Error Handling** - Log errors but still return 200 OK
6. **Testing** - Use webhook testing tools (Svix Play, RequestBin)

### Example Webhook Consumer

```typescript
@Controller('webhooks/time-entry')
export class TimeEntryWebhookController {
  constructor(
    private readonly queueService: QueueService,
    private readonly webhookService: WebhookService,
  ) {}

  @Post()
  async handleWebhook(
    @Headers('x-signature') signature: string,
    @Headers('x-timestamp') timestamp: string,
    @Body() payload: any,
  ) {
    // 1. Verify signature
    const isValid = this.webhookService.verifySignature(
      payload,
      signature,
      timestamp,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    // 2. Check timestamp (prevent replay attacks)
    const age = Date.now() - new Date(timestamp).getTime();
    if (age > 5 * 60 * 1000) {
      throw new UnauthorizedException('Webhook too old');
    }

    // 3. Queue for async processing
    await this.queueService.add('webhook-events', payload);

    // 4. Return success immediately
    return { received: true };
  }
}
```

## Testing Webhooks

### Local Development

For local webhook testing:

1. **ngrok** - Expose local server to internet
   ```bash
   ngrok http 3003
   ```

2. **Svix Play** - Test webhook payload structure
   - Visit: https://www.svix.com/play/

3. **RequestBin** - Inspect webhook deliveries
   - Visit: https://requestbin.com

### Webhook Testing Checklist

- [ ] Signature verification works correctly
- [ ] Timestamp validation prevents replay attacks
- [ ] Idempotency prevents duplicate processing
- [ ] Error handling doesn't block webhook delivery
- [ ] Retry logic handles failures gracefully
- [ ] Logging captures all webhook events
- [ ] Performance meets 5-second response requirement

## Related Documentation

- API Overview: `docs/02-backend/04-api/1-overview.md`
- Authentication: `d:\codes\time-entry\backend\src\auth\auth.guard.ts`
- Clerk Documentation: https://clerk.com/docs/webhooks
- Svix Documentation: https://docs.svix.com

## Current Status

**Status:** Not Implemented

Custom webhooks are not currently implemented in this application. The application relies on Clerk's built-in webhook system for user authentication events.

**Future Consideration:** Implement custom webhooks when third-party integrations are needed (e.g., Slack notifications, external time tracking tools, billing systems).
