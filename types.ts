// types.ts

// Complete type definitions for all interfaces used throughout the application.

export interface Persona {
    id: string;
    name: string;
    age?: number;
    traits: Array<string>;
}

export interface UserProfile {
    username: string;
    email: string;
    preferences: { [key: string]: any };
    persona: Persona;
}

export interface GitHubConfig {
    token: string;
    repo: string;
    owner: string;
}

export interface ApiKeyData {
    apiKey: string;
    createdAt: Date;
    isActive: boolean;
}

export interface DriveItem {
    id: string;
    name: string;
    type: FileType;
    size: number;
    createdAt: Date;
}

export enum FileType {
    DOCUMENT = 'document',
    IMAGE = 'image',
    VIDEO = 'video',
    AUDIO = 'audio'
}

export interface Message {
    senderId: string;
    recipientId: string;
    content: string;
    timestamp: Date;
}

export interface Language {
    code: string;
    name: string;
}

// Add additional missing types below

// TODO: Include other necessary types that are used throughout the application.