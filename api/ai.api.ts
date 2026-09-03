import { apiRequest } from "./client";

export function createConversation(title: string) {
    return apiRequest("/ai/conversations", {
        method: "POST",
        body: JSON.stringify({ title }),
    });
}

export function getConversations() {
    return apiRequest("/ai/conversations");
}

export function getConversation(id: string) {
    return apiRequest(`/ai/conversations/${id}`);
}

export function deleteConversation(id: string) {
    return apiRequest(`/ai/conversations/${id}`, {
        method: "DELETE",
    });
}

export function sendMessage(conversationId: string, message: string) {
    return apiRequest(`/ai/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ message }),
    });
}

export function generateAiImage(prompt: string, aspectRatio?: string) {
    return apiRequest("/ai/generate-image", {
        method: "POST",
        body: JSON.stringify({ prompt, aspectRatio }),
    });
}

export function generateAiMindMap(topic: string) {
    return apiRequest("/ai/mind-map", {
        method: "POST",
        body: JSON.stringify({ topic }),
    });
}
