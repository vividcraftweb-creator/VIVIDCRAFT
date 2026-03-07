'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Key,
  Code,
  Lock,
  Zap,
  FileCode,
  Shield,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function ApiDocumentationPage() {
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
    toast.success('Copied to clipboard');
  };

  const endpoints = [
    {
      method: 'GET',
      path: '/api/v1/jobs',
      scope: 'read:jobs',
      description: 'List all jobs',
      params: [
        { name: 'limit', type: 'number', default: '20', description: 'Number of results (max 100)' },
        { name: 'offset', type: 'number', default: '0', description: 'Pagination offset' },
        { name: 'status', type: 'string', optional: true, description: 'Filter by status (DRAFT, OPEN, CLOSED)' },
      ],
      response: {
        data: [
          {
            id: 'uuid',
            title: 'Senior Full Stack Developer',
            description: 'Looking for...',
            category: 'DEVELOPMENT',
            skills: ['React', 'Node.js'],
            budgetType: 'FIXED',
            budgetAmount: 5000,
            currency: 'USD',
            status: 'OPEN',
            createdAt: '2025-01-15T10:00:00Z'
          }
        ],
        pagination: {
          limit: 20,
          offset: 0,
          total: 150
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v1/jobs',
      scope: 'write:jobs',
      description: 'Create a new job',
      body: {
        title: 'Senior Full Stack Developer (required)',
        description: 'Looking for an experienced developer...',
        category: 'DEVELOPMENT (required)',
        skills: ['React', 'Node.js'],
        budgetType: 'FIXED (required)',
        budgetAmount: 5000,
        currency: 'USD',
        duration: 'Long-term',
        experienceLevel: 'EXPERT',
        locationType: 'REMOTE'
      },
      response: {
        data: {
          id: 'uuid',
          title: 'Senior Full Stack Developer',
          status: 'DRAFT',
          createdAt: '2025-01-15T10:00:00Z'
        },
        message: 'Job created successfully'
      }
    },
    {
      method: 'GET',
      path: '/api/v1/jobs/:id',
      scope: 'read:jobs',
      description: 'Get a specific job by ID',
      params: [
        { name: 'id', type: 'string', description: 'Job ID (URL parameter)' }
      ],
      response: {
        data: {
          id: 'uuid',
          title: 'Senior Full Stack Developer',
          description: 'Looking for...',
          category: 'DEVELOPMENT',
          skills: ['React', 'Node.js'],
          budgetType: 'FIXED',
          budgetAmount: 5000,
          currency: 'USD',
          status: 'OPEN',
          createdAt: '2025-01-15T10:00:00Z',
          client: {
            id: 'uuid',
            email: 'client@example.com',
            profile: {
              companyName: 'Tech Corp'
            }
          }
        }
      }
    },
    {
      method: 'PATCH',
      path: '/api/v1/jobs/:id',
      scope: 'write:jobs',
      description: 'Update an existing job',
      body: {
        title: 'Updated title',
        description: 'Updated description',
        status: 'OPEN'
      },
      response: {
        data: {
          id: 'uuid',
          title: 'Updated title',
          updatedAt: '2025-01-15T11:00:00Z'
        },
        message: 'Job updated successfully'
      }
    },
    {
      method: 'DELETE',
      path: '/api/v1/jobs/:id',
      scope: 'write:jobs',
      description: 'Delete a job',
      params: [
        { name: 'id', type: 'string', description: 'Job ID (URL parameter)' }
      ],
      response: {
        message: 'Job deleted successfully'
      }
    },
    {
      method: 'GET',
      path: '/api/v1/analytics',
      scope: 'read:analytics',
      description: 'Get analytics and statistics',
      params: [
        { name: 'days', type: 'number', default: '30', description: 'Number of days to analyze (max 365)' },
      ],
      response: {
        data: {
          jobs: {
            total: 150,
            active: 45,
            closed: 100,
            draft: 5
          },
          proposals: {
            total: 500,
            pending: 120,
            accepted: 200,
            rejected: 180
          },
          period: {
            days: 30,
            startDate: '2024-12-15T00:00:00Z',
            endDate: '2025-01-15T23:59:59Z'
          }
        }
      }
    }
  ];

  const codeExamples = {
    javascript: `// Using fetch API
const apiKey = 'jh_live_your_api_key_here';
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com';

async function listJobs() {
  const response = await fetch(\`\${baseUrl}/api/v1/jobs?limit=10\`, {
    method: 'GET',
    headers: {
      'Authorization': \`Bearer \${apiKey}\`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

const api = axios.create({
  baseURL: '${process.env.NEXT_PUBLIC_SITE_URL || 'https://yourdomain.com'}/api/v1',
  headers: {
    'Authorization': 'Bearer jh_live_your_api_key_here',
    'Content-Type': 'application/json'
  }
});

// Get jobs
api.get('/jobs', { params: { limit: 10 } })
  .then(response => response.data)
  .catch(error => error);

// Create job
api.post('/jobs', {
  title: 'Full Stack Developer',
  category: 'DEVELOPMENT',
  budgetType: 'FIXED',
  budgetAmount: 5000
})
  .then(response => response.data)
  .catch(error => error);`
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20 mb-4">
            <FileCode className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">API Documentation v1</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            JobHorizons API
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Programmatic access to manage jobs and analytics. Available for Business and Enterprise plans.
          </p>
          <div className="flex items-center justify-center gap-4 mt-6">
            <Link href="/settings/api-keys">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Key className="h-4 w-4 mr-2" />
                Get API Key
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Start */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              Quick Start
            </CardTitle>
            <CardDescription className="text-slate-400">
              Get started with the JobHorizons API in 3 simple steps
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Create an API Key</h4>
                <p className="text-slate-400 text-sm">
                  Go to <Link href="/settings/api-keys" className="text-primary hover:underline">Settings → API Keys</Link> and create a new key with the required scopes
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Make Your First Request</h4>
                <p className="text-slate-400 text-sm">
                  Use your API key in the Authorization header: <code className="px-2 py-1 bg-black/30 rounded text-xs">Bearer jh_live_...</code>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="text-white font-medium mb-1">Handle Responses</h4>
                <p className="text-slate-400 text-sm">
                  All responses are in JSON format with consistent error handling and pagination
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-green-400" />
              Authentication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-300">
              All API requests must include your API key in the Authorization header:
            </p>
            <div className="bg-black/40 p-4 rounded-lg border border-white/10 relative">
              <pre className="text-sm text-slate-300 overflow-x-auto">
                <code>Authorization: Bearer jh_live_your_api_key_here</code>
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard('Authorization: Bearer jh_live_your_api_key_here', 'auth-header')}
              >
                {copiedSnippet === 'auth-header' ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <Shield className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-200 font-medium mb-1">Security Best Practices</p>
                <ul className="text-yellow-300/80 text-sm space-y-1 list-disc list-inside">
                  <li>Never expose your API key in client-side code</li>
                  <li>Use environment variables to store keys</li>
                  <li>Rotate keys regularly and revoke unused ones</li>
                  <li>Monitor API key usage in the dashboard</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rate Limits */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Rate Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <h4 className="text-blue-300 font-medium mb-2">Business Plan</h4>
                <p className="text-3xl font-bold text-white">100</p>
                <p className="text-blue-200/80 text-sm">requests per hour</p>
              </div>
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <h4 className="text-purple-300 font-medium mb-2">Enterprise Plan</h4>
                <p className="text-3xl font-bold text-white">1,000</p>
                <p className="text-purple-200/80 text-sm">requests per hour</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm">
              Rate limits are enforced per API key. If exceeded, you&apos;ll receive a 429 status code with a Retry-After header.
            </p>
          </CardContent>
        </Card>

        {/* Code Examples */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Code className="h-5 w-5 text-blue-400" />
              Code Examples
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="javascript" className="w-full">
              <TabsList className="bg-white/10 border border-white/10">
                <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                <TabsTrigger value="nodejs">Node.js</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
                <TabsTrigger value="curl">cURL</TabsTrigger>
              </TabsList>
              {Object.entries(codeExamples).map(([lang, code]) => (
                <TabsContent key={lang} value={lang} className="relative">
                  <div className="bg-black/40 p-4 rounded-lg border border-white/10">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-6 right-6"
                      onClick={() => copyToClipboard(code, `code-${lang}`)}
                    >
                      {copiedSnippet === `code-${lang}` ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <pre className="text-sm text-slate-300 overflow-x-auto">
                      <code>{code}</code>
                    </pre>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* API Endpoints */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">API Endpoints</CardTitle>
            <CardDescription className="text-slate-400">
              Complete reference of available endpoints
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {endpoints.map((endpoint, idx) => (
              <div key={idx} className="border border-white/10 rounded-lg p-5 bg-black/20">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Badge
                      className={`${
                        endpoint.method === 'GET' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                        endpoint.method === 'POST' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                        endpoint.method === 'PATCH' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                        'bg-red-500/20 text-red-300 border-red-500/30'
                      }`}
                    >
                      {endpoint.method}
                    </Badge>
                    <code className="text-sm text-slate-300 font-mono">{endpoint.path}</code>
                  </div>
                  <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                    {endpoint.scope}
                  </Badge>
                </div>

                <p className="text-slate-400 mb-4">{endpoint.description}</p>

                {endpoint.params && endpoint.params.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-white mb-2">Parameters</h5>
                    <div className="space-y-2">
                      {endpoint.params.map((param, paramIdx) => (
                        <div key={paramIdx} className="flex items-start gap-2 text-sm">
                          <code className="text-blue-300 font-mono">{param.name}</code>
                          <Badge variant="outline" className="text-xs border-white/20 text-slate-400">
                            {param.type}
                          </Badge>
                          {'optional' in param && param.optional && (
                            <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-400">
                              optional
                            </Badge>
                          )}
                          {'default' in param && param.default && (
                            <span className="text-slate-500 text-xs">default: {param.default}</span>
                          )}
                          <span className="text-slate-400">{param.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {endpoint.body && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-white mb-2">Request Body</h5>
                    <div className="bg-black/40 p-3 rounded border border-white/10">
                      <pre className="text-xs text-slate-300 overflow-x-auto">
                        <code>{JSON.stringify(endpoint.body, null, 2)}</code>
                      </pre>
                    </div>
                  </div>
                )}

                <div>
                  <h5 className="text-sm font-medium text-white mb-2">Response</h5>
                  <div className="bg-black/40 p-3 rounded border border-white/10">
                    <pre className="text-xs text-slate-300 overflow-x-auto">
                      <code>{JSON.stringify(endpoint.response, null, 2)}</code>
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Error Codes */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              Error Handling
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-300">
              The API uses standard HTTP status codes. All error responses include a JSON body with error details:
            </p>
            <div className="bg-black/40 p-4 rounded-lg border border-white/10">
              <pre className="text-sm text-slate-300 overflow-x-auto">
                <code>{JSON.stringify({
                  error: 'Error Type',
                  message: 'Human-readable error message'
                }, null, 2)}</code>
              </pre>
            </div>
            <div className="grid gap-3">
              {[
                { code: 200, status: 'OK', description: 'Request successful' },
                { code: 201, status: 'Created', description: 'Resource created successfully' },
                { code: 400, status: 'Bad Request', description: 'Invalid request parameters' },
                { code: 401, status: 'Unauthorized', description: 'Missing or invalid API key' },
                { code: 403, status: 'Forbidden', description: 'Insufficient permissions or plan' },
                { code: 404, status: 'Not Found', description: 'Resource not found' },
                { code: 429, status: 'Too Many Requests', description: 'Rate limit exceeded' },
                { code: 500, status: 'Internal Server Error', description: 'Server error' }
              ].map((error) => (
                <div key={error.code} className="flex items-center gap-3 p-3 bg-black/20 rounded border border-white/10">
                  <Badge className={`${
                    error.code >= 200 && error.code < 300 ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                    error.code >= 400 && error.code < 500 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                    'bg-red-500/20 text-red-300 border-red-500/30'
                  }`}>
                    {error.code}
                  </Badge>
                  <div>
                    <span className="text-white font-medium">{error.status}</span>
                    <span className="text-slate-400 text-sm ml-2">{error.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Support */}
        <Card className="bg-gradient-to-r from-primary/20 to-blue-500/20 border-primary/30">
          <CardHeader>
            <CardTitle className="text-white">Need Help?</CardTitle>
            <CardDescription className="text-slate-300">
              Our support team is here to help you integrate the API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/support">
                <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </Link>
              <Link href="/settings/api-keys">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  <Key className="h-4 w-4 mr-2" />
                  Manage API Keys
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
