'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Star,
    MapPin,
    Clock,
    Award,
    Phone,
    ExternalLink,
    CheckCircle,
} from 'lucide-react';

interface Specialist {
    npi: string;
    first_name?: string;
    last_name?: string;
    organization_name?: string;
    specialty: string;
    city: string;
    state: string;
    phone?: string;
    distance_miles?: number;
    mips_quality_score?: number;
    estimated_wait_days?: number;
    rank_score?: number;
}

interface SpecialistRecommendationsProps {
    specialty: string;
    city: string;
    state: string;
    onSelect?: (specialist: Specialist) => void;
    selectedNpi?: string;
    limit?: number;
}

export function SpecialistRecommendations({
    specialty,
    city,
    state,
    onSelect,
    selectedNpi,
    limit = 6,
}: SpecialistRecommendationsProps) {
    const [specialists, setSpecialists] = useState<Specialist[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchSpecialists() {
            setIsLoading(true);
            setError(null);

            try {
                const params = new URLSearchParams({
                    specialty,
                    city,
                    state,
                    limit: limit.toString(),
                });

                const response = await fetch(`/api/specialists?${params}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch specialists');
                }

                const data = await response.json();
                setSpecialists(data.data || []);
            } catch (err) {
                console.error('Error fetching specialists:', err);
                setError('Failed to load specialist recommendations');
            } finally {
                setIsLoading(false);
            }
        }

        if (specialty && state) {
            fetchSpecialists();
        }
    }, [specialty, city, state, limit]);

    // Loading skeleton
    if (isLoading) {
        return (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Finding Specialists...
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="rounded-2xl">
                            <CardContent className="p-4">
                                <Skeleton className="h-6 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2 mb-4" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-2/3" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="text-center py-8 bg-red-50 dark:bg-red-900/20 rounded-2xl">
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => window.location.reload()}
                >
                    Retry
                </Button>
            </div>
        );
    }

    // No results
    if (specialists.length === 0) {
        return (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                <p className="text-gray-500">No specialists found in your area</p>
                <p className="text-sm text-gray-400 mt-1">Try expanding your search radius</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Recommended Specialists
                </h3>
                <Badge variant="outline" className="text-xs">
                    {specialists.length} found
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {specialists.map((specialist, index) => {
                    const name = specialist.organization_name ||
                        `${specialist.first_name} ${specialist.last_name}`.trim() ||
                        'Unknown Provider';
                    const isTopRecommended = index < 3;
                    const isSelected = selectedNpi === specialist.npi;

                    return (
                        <Card
                            key={specialist.npi}
                            className={`rounded-2xl transition-all duration-200 hover:shadow-lg cursor-pointer ${isSelected
                                    ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : ''
                                }`}
                            onClick={() => onSelect?.(specialist)}
                        >
                            <CardContent className="p-4">
                                {/* Header with badges */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                                            {name}
                                        </h4>
                                        <p className="text-sm text-gray-500">{specialist.specialty}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        {isTopRecommended && (
                                            <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs">
                                                <Award className="w-3 h-3 mr-1" />
                                                Top Pick
                                            </Badge>
                                        )}
                                        {isSelected && (
                                            <Badge className="bg-blue-500 text-white">
                                                <CheckCircle className="w-3 h-3" />
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Stats grid */}
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    {/* Quality Score */}
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="p-1.5 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                                            <Star className="w-3.5 h-3.5 text-yellow-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Quality</p>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {specialist.mips_quality_score
                                                    ? `${Math.round(specialist.mips_quality_score)}%`
                                                    : 'N/A'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Distance */}
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                            <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Distance</p>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {specialist.distance_miles
                                                    ? `${Math.round(specialist.distance_miles)} mi`
                                                    : `${specialist.city}, ${specialist.state}`}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Wait Time */}
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
                                            <Clock className="w-3.5 h-3.5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Wait Time</p>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {specialist.estimated_wait_days
                                                    ? `~${specialist.estimated_wait_days} days`
                                                    : 'Unknown'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Rank Score */}
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                            <Award className="w-3.5 h-3.5 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Rank</p>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {specialist.rank_score
                                                    ? Math.round(specialist.rank_score)
                                                    : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    {specialist.phone && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.location.href = `tel:${specialist.phone}`;
                                            }}
                                        >
                                            <Phone className="w-3.5 h-3.5 mr-1" />
                                            Call
                                        </Button>
                                    )}
                                    <Button
                                        variant={isSelected ? 'default' : 'outline'}
                                        size="sm"
                                        className="flex-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelect?.(specialist);
                                        }}
                                    >
                                        {isSelected ? (
                                            <>
                                                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                                Selected
                                            </>
                                        ) : (
                                            <>
                                                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                                Select
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Ranking explanation */}
            <p className="text-xs text-gray-400 text-center">
                Rankings based on quality scores, distance, and estimated wait times.
                <br />
                Data sourced from NPI Registry and CMS datasets.
            </p>
        </div>
    );
}
