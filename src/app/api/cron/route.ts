import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface CronJob {
  schedule: string;
  command: string;
  description: string;
  nextRun: Date;
}

function calculateNextRun(schedule: string): Date {
  const now = new Date();
  const parts = schedule.split(' ');
  const minute = parts[0] === '*/30' ? 30 : parseInt(parts[0]);
  const hour = parseInt(parts[1]);
  
  let next = new Date(now);
  if (parts[0] === '*/30') {
    if (next.getMinutes() < 30) {
      next.setMinutes(30, 0, 0);
    } else {
      next.setHours(next.getHours() + 1, 0, 0, 0);
    }
  } else {
    next.setHours(hour, minute, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
  }
  return next;
}

function getDescription(command: string): string {
  if (command.includes('daily-briefing')) return 'Morning Briefing';
  if (command.includes('evening-summary')) return 'Evening Summary';
  if (command.includes('heartbeat-integration')) return 'Heartbeat Check (every 30 min)';
  if (command.includes('openclaw update')) return 'OpenClaw Update';
  return command.split('/').pop() || command;
}

export async function GET() {
  try {
    const { stdout } = await execAsync('crontab -l 2>/dev/null || echo ""');
    const lines = stdout.trim().split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    const cronJobs: CronJob[] = lines
      .map(line => {
        const parts = line.match(/^([\d\*\/\-,\s]+)\s+(.+)$/);
        if (!parts) return undefined;
        
        const schedule = parts[1].trim();
        const command = parts[2].trim();
        
        return {
          schedule,
          command,
          description: getDescription(command),
          nextRun: calculateNextRun(schedule)
        };
      })
      .filter((job): job is CronJob => job !== undefined);
    
    return NextResponse.json({ cronJobs });
  } catch (error) {
    console.error('Failed to fetch cron jobs:', error);
    return NextResponse.json({ error: 'Failed to fetch cron jobs', cronJobs: [] }, { status: 500 });
  }
}
