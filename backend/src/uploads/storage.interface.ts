export interface IStorageService {
  saveFile(file: Express.Multer.File): Promise<string>;
}
