import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';

const ImageUploader = ({ onChange, maxImages = 2 }) => {
    const [images, setImages] = useState([]);
    const [previews, setPreviews] = useState([]);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Filter to ensure max limitation
        const newFiles = [...images, ...files].slice(0, maxImages);
        setImages(newFiles);
        onChange(newFiles);

        // Create previews
        const newPreviews = newFiles.map(file => URL.createObjectURL(file));
        setPreviews(newPreviews);
    };

    const removeImage = (index) => {
        const newImages = images.filter((_, i) => i !== index);
        const newPreviews = previews.filter((_, i) => i !== index);
        setImages(newImages);
        setPreviews(newPreviews);
        onChange(newImages);
    };

    return (
        <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                Product Images (Max {maxImages})
            </label>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {previews.map((preview, index) => (
                    <div key={index} style={{ position: 'relative', width: '100px', height: '100px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <img src={preview} alt={`Preview ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                            type="button"
                            onClick={() => removeImage(index)}
                            style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', background: 'rgba(0,0,0,0.5)', color: 'white', borderRadius: '50%', padding: '0.125rem' }}
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}

                {images.length < maxImages && (
                    <label style={{ width: '100px', height: '100px', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <Upload size={24} />
                        <span style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Upload</span>
                        <input type="file" multiple accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                    </label>
                )}
            </div>
        </div>
    );
};

export default ImageUploader;
