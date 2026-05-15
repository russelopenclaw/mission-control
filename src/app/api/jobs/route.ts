import { NextResponse } from 'next/server';

// LinkedIn search URLs for direct access
const SEARCH_URLS = {
  kansasJava: 'https://www.linkedin.com/jobs/search/?keywords=Senior+Software+Engineer+Java&location=Kansas%2C+United+States&f_JT=F',
  kansasDotNet: 'https://www.linkedin.com/jobs/search/?keywords=Senior+Software+Engineer+.NET&location=Kansas%2C+United+States&f_JT=F',
  remoteJava: 'https://www.linkedin.com/jobs/search/?keywords=Senior+Java+Developer&location=United+States&f_JT=F&f_WT=2',
  remoteDotNet: 'https://www.linkedin.com/jobs/search/?keywords=Senior+.NET+Developer&location=United+States&f_JT=F&f_WT=2',
};

interface JobListing {
  title: string;
  company: string;
  location: string;
  postedAgo: string;
  url: string;
  type: 'remote' | 'onsite' | 'hybrid';
}

// Curated job listings - refreshed periodically
// Last updated: 2026-04-16
const CURATED_JOBS: JobListing[] = [
  // Kansas-based
  { title: 'Lead Java Software Engineer', company: 'Garmin', location: 'Olathe, KS', postedAgo: '2 hours ago', url: 'https://www.linkedin.com/jobs/search/?keywords=Lead+Java+Software+Engineer+Garmin&location=Olathe%2C+KS', type: 'onsite' },
  { title: 'Sr. Engineer, Software', company: 'T-Mobile', location: 'Overland Park, KS', postedAgo: '1 day ago', url: 'https://www.linkedin.com/jobs/search/?keywords=Sr+Engineer+Software+T-Mobile&location=Overland+Park%2C+KS', type: 'hybrid' },
  { title: 'Senior Software Engineer', company: 'Garmin', location: 'Olathe, KS', postedAgo: '2 days ago', url: 'https://www.linkedin.com/jobs/search/?keywords=Senior+Software+Engineer+Garmin&location=Olathe%2C+KS', type: 'onsite' },
  { title: 'Senior Software Developer', company: 'Inceed', location: 'Lenexa, KS', postedAgo: '3 days ago', url: 'https://www.linkedin.com/jobs/search/?keywords=Senior+Software+Developer+Inceed&location=Lenexa%2C+KS', type: 'onsite' },
  { title: 'Senior Java Developer', company: 'Garmin', location: 'Olathe, KS', postedAgo: '2 weeks ago', url: 'https://www.linkedin.com/jobs/search/?keywords=Senior+Java+Developer+Garmin&location=Olathe%2C+KS', type: 'onsite' },
  { title: 'Senior Software Engineer - Java', company: 'Garmin', location: 'Olathe, KS', postedAgo: '1 week ago', url: 'https://www.linkedin.com/jobs/search/?keywords=Senior+Software+Engineer+Java+Garmin&location=Olathe%2C+KS', type: 'onsite' },
  { title: 'Sr. Software Engineer', company: 'WellSky', location: 'Overland Park, KS', postedAgo: '6 days ago', url: 'https://www.linkedin.com/jobs/search/?keywords=Sr+Software+Engineer+WellSky&location=Overland+Park%2C+KS', type: 'onsite' },
  { title: 'Lead Java Software Engineer', company: 'Garmin', location: 'Olathe, KS', postedAgo: '2 weeks ago', url: 'https://www.linkedin.com/jobs/search/?keywords=Lead+Java+Software+Engineer+Garmin&location=Olathe%2C+KS', type: 'onsite' },
  { title: 'Slalom Flex - Sr. Java Software Engineer', company: 'Slalom', location: 'Kansas City, MO', postedAgo: '2 weeks ago', url: 'https://www.linkedin.com/jobs/search/?keywords=Sr+Java+Software+Engineer+Slalom&location=Kansas+City%2C+MO', type: 'hybrid' },
  { title: 'Principal Software Engineer - C#/AKS/Azure/DevOps', company: 'H&R Block', location: 'Kansas City, MO', postedAgo: '1 week ago', url: 'https://www.linkedin.com/jobs/search/?keywords=Principal+Software+Engineer+H%26R+Block&location=Kansas+City%2C+MO', type: 'hybrid' },
  { title: 'Senior Software Engineer (Full Stack)', company: 'O2E Brands', location: 'Overland Park, KS', postedAgo: '2 weeks ago', url: 'https://www.linkedin.com/jobs/search/?keywords=Senior+Software+Engineer+O2E+Brands&location=Overland+Park%2C+KS', type: 'onsite' },
  { title: 'Senior Software Engineer', company: 'TENEX.AI', location: 'Overland Park, KS', postedAgo: '2 weeks ago', url: 'https://www.linkedin.com/jobs/search/?keywords=Senior+Software+Engineer+TENEX&location=Overland+Park%2C+KS', type: 'onsite' },
  { title: 'Senior Software Engineer, Quant', company: 'Cboe Global Markets', location: 'Overland Park, KS', postedAgo: '5 days ago', url: 'https://www.linkedin.com/jobs/search/?keywords=Senior+Software+Engineer+Quant+Cboe&location=Overland+Park%2C+KS', type: 'hybrid' },
  // Remote US
  { title: 'Senior Software Engineer (L5) - Analysis', company: 'Netflix', location: 'United States (Remote)', postedAgo: '2 weeks ago', url: 'https://www.linkedin.com/jobs/search/?keywords=Senior+Software+Engineer+Analysis+Netflix&location=United+States', type: 'remote' },
  { title: 'Sr. Software Engineer, Backend', company: 'Acorns', location: 'United States (Remote)', postedAgo: '1 week ago', url: 'https://www.linkedin.com/jobs/search/?keywords=Sr+Software+Engineer+Backend+Acorns&location=United+States', type: 'remote' },
  { title: 'Senior Software Engineer', company: 'Tebra', location: 'United States (Remote)', postedAgo: '2 weeks ago', url: 'https://www.linkedin.com/jobs/search/?keywords=Senior+Software+Engineer+Tebra&location=United+States', type: 'remote' },
  { title: 'Sr. Software Engineer - Backend', company: 'Lively, Inc.', location: 'United States (Remote)', postedAgo: '1 week ago', url: 'https://www.linkedin.com/jobs/search/?keywords=Sr+Software+Engineer+Backend+Lively&location=United+States', type: 'remote' },
  { title: 'Senior Software Engineer - Backend', company: 'Foodsmart', location: 'United States (Remote)', postedAgo: '1 week ago', url: 'https://www.linkedin.com/jobs/search/?keywords=Senior+Software+Engineer+Backend+Foodsmart&location=United+States', type: 'remote' },
  { title: 'Senior Software Engineer- Big Data & Java', company: 'PointClickCare', location: 'United States (Remote)', postedAgo: '1 week ago', url: 'https://www.linkedin.com/jobs/search/?keywords=Senior+Software+Engineer+Big+Data+Java+PointClickCare&location=United+States', type: 'remote' },
  { title: 'Senior Software Engineer, Backend', company: 'Freshworks', location: 'United States (Remote)', postedAgo: '1 day ago', url: 'https://www.linkedin.com/jobs/search/?keywords=Senior+Software+Engineer+Backend+Freshworks&location=United+States', type: 'remote' },
  { title: 'Senior Software Engineer I, Backend', company: 'Aledade, Inc.', location: 'United States (Remote)', postedAgo: '5 days ago', url: 'https://www.linkedin.com/jobs/search/?keywords=Senior+Software+Engineer+Backend+Aledade&location=United+States', type: 'remote' },
];

export async function GET() {
  return NextResponse.json({
    searchedAt: new Date().toISOString(),
    lastRefreshed: '2026-04-16',
    total: CURATED_JOBS.length,
    ks: CURATED_JOBS.filter(j => j.type !== 'remote').length,
    remote: CURATED_JOBS.filter(j => j.type === 'remote').length,
    searchUrls: SEARCH_URLS,
    jobs: CURATED_JOBS,
  });
}