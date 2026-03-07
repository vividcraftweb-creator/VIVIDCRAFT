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

  if (isLoading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (error || !profile) {
    return <div className="container mx-auto p-4">Profile not found</div>;
  }

  const isOwnProfile = session?.session?.user?.id === id;

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader className="flex flex-row justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              {profile.firstName} {profile.lastName}
              {profile.verified && (
                <Badge variant="secondary" className="text-xs">
                  Verified
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {profile.companyName && <span>{profile.companyName}</span>}
            </CardDescription>
          </div>
          {isOwnProfile && (
            <Button asChild>
              <Link href="/profile/edit">Edit Profile</Link>
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {profile.skills && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills.split(',').map((skill, index) => (
                  <Badge key={index} variant="outline">
                    {skill.trim()}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {profile.rate && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Hourly Rate</h3>
              <p className="text-2xl font-bold text-green-600">
                ${profile.rate}/hour
              </p>
            </div>
          )}

          {profile.portfolio && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Portfolio</h3>
              <div className="prose max-w-none">
                <a
                  href={profile.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {profile.portfolio}
                </a>
              </div>
            </div>
          )}

          {profile.companyInfo && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Company Information</h3>
              <p className="text-gray-600">{profile.companyInfo}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
