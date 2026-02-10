// Tool: google-calendar-create-event
import '../skill-state';

export const createEventTool: ToolDefinition = {
  name: 'google-calendar-create-event',
  description:
    'Create a new event in a Google Calendar. Provide start/end as dateTime (RFC3339) or date (YYYY-MM-DD) for all-day.',
  input_schema: {
    type: 'object',
    properties: {
      calendar_id: {
        type: 'string',
        description: 'Calendar ID (use "primary" for primary calendar). Default: primary',
      },
      summary: { type: 'string', description: 'Event title/summary' },
      description: { type: 'string', description: 'Event description' },
      location: { type: 'string', description: 'Event location' },
      start_date_time: {
        type: 'string',
        description: 'Start time in RFC3339 (e.g. 2025-02-10T14:00:00Z) for timed events',
      },
      end_date_time: { type: 'string', description: 'End time in RFC3339 for timed events' },
      start_date: { type: 'string', description: 'Start date YYYY-MM-DD for all-day events' },
      end_date: { type: 'string', description: 'End date YYYY-MM-DD for all-day events' },
      time_zone: {
        type: 'string',
        description: 'IANA time zone (e.g. America/New_York) for start/end',
      },
      attendees: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of attendee email addresses',
      },
    },
    required: ['summary'],
  },
  execute(args: Record<string, unknown>): string {
    try {
      const calendarFetch = (globalThis as { calendarFetch?: (e: string, o?: object) => any })
        .calendarFetch;
      if (!calendarFetch) {
        return JSON.stringify({ success: false, error: 'Calendar API helper not available' });
      }
      if (!oauth.getCredential()) {
        return JSON.stringify({
          success: false,
          error: 'Google Calendar not connected. Complete OAuth setup first.',
        });
      }
      const calendarId = (args.calendar_id as string) || 'primary';
      const allDay =
        Boolean(args.start_date) ||
        (Boolean(args.end_date) && !args.start_date_time && !args.end_date_time);
      const start: Record<string, string> = allDay
        ? { date: (args.start_date as string) || (args.end_date as string) }
        : {
            dateTime: (args.start_date_time as string) || new Date().toISOString(),
            timeZone: (args.time_zone as string) || 'UTC',
          };
      const end: Record<string, string> = allDay
        ? { date: (args.end_date as string) || (args.start_date as string) || start.date }
        : {
            dateTime: (args.end_date_time as string) || start.dateTime,
            timeZone: (args.time_zone as string) || 'UTC',
          };
      const body = {
        summary: args.summary,
        description: args.description,
        location: args.location,
        start,
        end,
        attendees: Array.isArray(args.attendees)
          ? (args.attendees as string[]).map((email: string) => ({ email }))
          : undefined,
      };
      const path = `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
      const response = calendarFetch(path, { method: 'POST', body: JSON.stringify(body) });
      if (!response.success) {
        return JSON.stringify({
          success: false,
          error: response.error?.message || 'Failed to create event',
        });
      }
      return JSON.stringify({ success: true, event: response.data });
    } catch (e) {
      return JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) });
    }
  },
};
