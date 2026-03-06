'use client';

import { useFCM } from '@/hooks/useFCM';

export default function FCMInitializer() {
    useFCM();
    return null;
}
