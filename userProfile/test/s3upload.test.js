const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const {uploadToS3} = require('../server');

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}) // Mock the send function
  })),
  PutObjectCommand: jest.fn()
}));

describe('uploadToS3', () => {
  it('should upload file to S3 and return the correct URL', async () => {
    const fakeFile = {
      originalname: 'test.jpg',
      buffer: Buffer.from('fake file data'),
      mimetype: 'image/jpeg',
    };

    const id = '12345';
    const expectedUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${id}-test.jpg`;

    const result = await uploadToS3(fakeFile, id);
    
    expect(result).toBe(expectedUrl);
    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `${id}-test.jpg`,
      Body: fakeFile.buffer,
      ContentType: fakeFile.mimetype,
      ACL: 'public-read',
    });
  });
});

