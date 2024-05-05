import {NoFileOptions} from './constants'

export interface UploadInputs {
  /**
   * The name of the artifact that will be uploaded
   */
  artifactName: string

  /**
   * The search path used to describe what to upload as part of the artifact
   */
  searchPath: string

  /**
   * The desired behavior if no files are found with the provided search path
   */
  ifNoFilesFound: NoFileOptions

  /**
   * Duration after which artifact will expire in days
   */
  retentionDays: number

  /**
   * The level of compression for Zlib to be applied to the artifact archive.
   */
  compressionLevel?: number

  /**
   * Whether or not to replace an existing artifact with the same name
   */
  overwrite: boolean
}

export interface UploadPerFile {
  /**
   * The search path used to describe what to upload as part of the artifact
   */
  searchPath: string

  /**
   * The desired behavior if no files are found with the provided search path
   */
  ifNoFilesFound: NoFileOptions

  /**
   * Duration after which artifact will expire in days
   */
  retentionDays: number

  /**
   * The level of compression for Zlib to be applied to the artifact archive.
   */
  compressionLevel?: number

  /**
   * Whether or not to replace an existing artifact with the same name
   */
  overwrite: boolean

  // artifact-per-file: {true | false}
  // @default: false
  artifactPerFile: boolean

  // https://nodejs.org/docs/latest-v20.x/api/path.html#pathparsepath
  // @args: searchResult.filesToUpload
  // @return: String.replace()
  // @default: pathObject.base
  // @default rule: "${base}"
  artifactNameRule: string
}
