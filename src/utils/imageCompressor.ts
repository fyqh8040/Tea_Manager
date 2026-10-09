/**
 * 客户端图片智能压缩工具
 * 在将图片转为 Base64 或上传至图床前自动压缩尺寸并降低体积，
 * 避免手机原图（3MB~10MB）撑爆 PostgreSQL 数据库或触发 Serverless 4.5MB 载荷上限。
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<{ file: File; base64: string }> {
  return new Promise((resolve, reject) => {
    // 如果不是图片类型直接报错
    if (!file.type.startsWith('image/')) {
      return reject(new Error('请选择有效的图片文件'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('解析图片数据失败'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // 等比例缩放
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            maxHeight = maxHeight;
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('无法创建画布进行图片压缩'));
        }

        // 平滑绘制
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // 输出为 JPEG 或 WebP (若支持)
        const mimeType = 'image/jpeg';
        const base64 = canvas.toDataURL(mimeType, quality);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve({ file, base64 });
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
              type: mimeType,
              lastModified: Date.now()
            });
            resolve({ file: compressedFile, base64 });
          },
          mimeType,
          quality
        );
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
