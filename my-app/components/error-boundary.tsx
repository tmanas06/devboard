'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex items-center justify-center min-h-[40vh]">
                    <Card className="w-full max-w-md">
                        <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8 text-center">
                            <div className="rounded-full bg-red-50 p-3">
                                <AlertCircle className="h-8 w-8 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Something went wrong</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    An unexpected error occurred. Please try again.
                                </p>
                            </div>
                            {this.state.error && (
                                <pre className="text-xs bg-muted p-3 rounded-md w-full overflow-auto max-h-24 text-left">
                                    {this.state.error.message}
                                </pre>
                            )}
                            <Button onClick={this.handleRetry} variant="outline" className="gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Try Again
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
