'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from '@/lib/api';
import { useAuth, useUser } from '@clerk/nextjs';
import { Loader2, Camera } from 'lucide-react';

const profileSchema = z.object({
    firstName: z.string().min(2, {
        message: 'First name must be at least 2 characters.',
    }),
    lastName: z.string().min(2, {
        message: 'Last name must be at least 2 characters.',
    }),
    email: z.string().email({
        message: 'Please enter a valid email address.',
    }),
});

interface ProfileFormProps {
    initialData: {
        firstName: string;
        lastName: string;
        email: string;
    };
}

export function ProfileForm({ initialData }: ProfileFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const { getToken } = useAuth();
    const { user } = useUser();

    const form = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: initialData.firstName || '',
            lastName: initialData.lastName || '',
            email: initialData.email || '',
        },
    });

    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        setIsUploadingAvatar(true);
        try {
            await user.setProfileImage({ file });
            toast({
                title: 'Avatar updated',
                description: 'Your profile picture has been successfully updated.',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Failed to update avatar',
                description: 'There was a problem uploading your image. Please try again.',
            });
        } finally {
            setIsUploadingAvatar(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Reset input
            }
        }
    };

    async function onSubmit(values: z.infer<typeof profileSchema>) {
        setIsLoading(true);
        try {
            const token = await getToken();
            await updateUserProfile(values, token);
            toast({
                title: 'Profile updated',
                description: 'Your profile has been successfully updated.',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Something went wrong',
                description: 'Your profile could not be updated. Please try again.',
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                    Update your personal details here. These changes will also be synced with your authentication provider.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b mb-8">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={user?.imageUrl} alt="Profile Picture" />
                        <AvatarFallback className="text-xl">
                            {initialData.firstName?.charAt(0) || 'U'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="space-y-3 text-center sm:text-left">
                        <div>
                            <h3 className="font-medium leading-none mb-1">Profile Picture</h3>
                            <p className="text-sm text-muted-foreground">
                                JPG, GIF or PNG. 1MB max.
                            </p>
                        </div>
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleAvatarChange}
                                className="hidden"
                                accept="image/jpeg,image/png,image/gif"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingAvatar}
                            >
                                {isUploadingAvatar ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Camera className="mr-2 h-4 w-4" />
                                )}
                                Change Picture
                            </Button>
                        </div>
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>First Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Last Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Doe" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email Address</FormLabel>
                                    <FormControl>
                                        <Input placeholder="john.doe@example.com" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Your primary email address for communication and login.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
