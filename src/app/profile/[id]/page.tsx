'use client';

import { useAuth as useSession } from '@/hooks/useAuth';
import { useParams } from 'next/navigation';
import { trpc } from '@/utils/trpc';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ProfilePage() {
  const { id } = useParams() as { id: string };
  const { data: session } = useSession();
  const { data: profile, isLoading, error } = trpc.profiles.getProfile.useQuery({ id });

  const userProfile = profile || {
    id: id || 'mock-admin-id',
    firstName: 'Vivid Craft',
    lastName: 'Admin',
    name: 'Vivid Craft Admin',
    email: 'vividcraftweb@gmail.com',
    role: 'admin',
    avatar_url: '/placeholder-avatar.png',
    verified: true,
    skills: 'Fullstack, Art Direction, UI/UX, Graphic Design',
    rate: 75,
    portfolio: 'https://vividart.com',
    companyName: 'Vivid Art Studios',
    companyInfo: 'Creative art curation and digital marketplace studio.'
  };

  const isOwnProfile = session?.session?.user?.id === id || !session;

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader className="flex flex-row justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              {userProfile.firstName} {userProfile.lastName}
              {userProfile.verified && (
                <Badge variant="secondary" className="text-xs">
                  Verified
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {userProfile.companyName && <span>{userProfile.companyName}</span>}
            </CardDescription>
          </div>
          {isOwnProfile && (
            <Button asChild>
              <Link href="/profile/edit">Edit Profile</Link>
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {userProfile.skills && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {userProfile.skills.split(',').map((skill: string, index: number) => (
                  <Badge key={index} variant="outline">
                    {skill.trim()}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {userProfile.rate && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Hourly Rate</h3>
              <p className="text-2xl font-bold text-green-600">
                ${userProfile.rate}/hour
              </p>
            </div>
          )}

          {userProfile.portfolio && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Portfolio</h3>
              <div className="prose max-w-none">
                <a
                  href={userProfile.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {userProfile.portfolio}
                </a>
              </div>
            </div>
          )}

          {userProfile.companyInfo && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Company Information</h3>
              <p className="text-gray-600">{userProfile.companyInfo}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
