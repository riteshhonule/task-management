export interface IStorageService {
  saveFile(file: Express.Multer.File, user?: any): Promise<string>;
}
