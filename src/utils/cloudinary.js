export const uploadImageToCloudinary = async (file) => {
    if (!file) return null;

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        console.error('Cloudinary is not configured. Please check your .env file.');
        throw new Error('Missing Cloudinary configuration.');
    }

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw error;
    }
};

export const optimizeImage = (url, width = 600) => {
    if (!url || !url.includes('cloudinary.com')) return url;
    
    // Insert transformation parameters after /upload/
    const parts = url.split('/upload/');
    if (parts.length !== 2) return url;
    
    return `${parts[0]}/upload/c_fill,w_${width},q_auto:eco,f_auto/${parts[1]}`;
};
