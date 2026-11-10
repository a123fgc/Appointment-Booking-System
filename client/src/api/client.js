
const BASE = '/api';

export class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
    const token = localStorage.getItem('token');

    const options = {
        method,
        credentials: 'include',
        headers: {},
    };

    // JWT token har protected request ke saath bhejein
    // token = localStorage.getItem('token');

    if (token) {
        options.headers.Authorization = `Bearer ${token}`;
    }

    if (body !== undefined) {
        if (isForm) {
            options.body = body;
        } else {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
    }

    let res;

    try {
        res = await fetch(BASE + path, options);
    } catch {
        throw new ApiError('Backend se connection nahi ho saka.', 0);
    }

    if (res.status === 204) return null;

    const text = await res.text();
    let data = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = null;
    }

    if (!res.ok) {
        throw new ApiError(
            data?.error || `Request fail ho gayi (${res.status})`,
            res.status
        );
    }

    return data;
}

export const api = {
    get: (path) => request(path),
    post: (path, body = {}) => request(path, { method: 'POST', body }),
    put: (path, body = {}) => request(path, { method: 'PUT', body }),
    patch: (path, body = {}) => request(path, { method: 'PATCH', body }),
    del: (path) => request(path, { method: 'DELETE' }),
    upload: (path, formData) =>
        request(path, { method: 'POST', body: formData, isForm: true }),
};
