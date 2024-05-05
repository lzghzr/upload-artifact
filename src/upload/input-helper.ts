import * as core from '@actions/core'
import {Inputs, NoFileOptions} from './constants'
import { UploadInputs, UploadPerFile } from './upload-inputs'

/**
 * Helper to get all the inputs for the action
 */
export function getInputs(): UploadInputs | UploadPerFile {
  const TRUE_MAP = ['true', 'True', 'TRUE']

  let artifactPerFile = false
  const artifactPerFileStr = core.getInput(Inputs.ArtifactPerFile)
  if (artifactPerFileStr) {
    artifactPerFile = TRUE_MAP.includes(artifactPerFileStr) ? true : false
  }

  let name = ''
  let artifactNameRule = ''
  if (!artifactPerFile) {
    name = core.getInput(Inputs.Name)
  } else {
    artifactNameRule = core.getInput(Inputs.ArtifactNameRule) || '${base}'
  }

  const path = core.getInput(Inputs.Path, {required: true})
  const overwrite = core.getBooleanInput(Inputs.Overwrite)

  const ifNoFilesFound = core.getInput(Inputs.IfNoFilesFound)
  const noFileBehavior: NoFileOptions = NoFileOptions[ifNoFilesFound]

  if (!noFileBehavior) {
    core.setFailed(
      `Unrecognized ${
        Inputs.IfNoFilesFound
      } input. Provided: ${ifNoFilesFound}. Available options: ${Object.keys(
        NoFileOptions
      )}`
    )
  }

  const typedInputs = (
    artifactPerFile: boolean
  ): UploadInputs | UploadPerFile => {
    let inputs: UploadInputs | UploadPerFile

    if (!artifactPerFile) {
      inputs = {
        artifactName: name,
        searchPath: path,
        ifNoFilesFound: noFileBehavior,
        overwrite: overwrite
      } as UploadInputs
    } else {
      inputs = {
        searchPath: path,
        ifNoFilesFound: noFileBehavior,
        overwrite: overwrite,
        artifactPerFile: artifactPerFile,
        artifactNameRule: artifactNameRule
      } as UploadPerFile
    }

    const retentionDaysStr = core.getInput(Inputs.RetentionDays)
    if (retentionDaysStr) {
      inputs.retentionDays = parseInt(retentionDaysStr)
      if (isNaN(inputs.retentionDays)) {
        core.setFailed('Invalid retention-days')
      }
    }

    const compressionLevelStr = core.getInput(Inputs.CompressionLevel)
    if (compressionLevelStr) {
      inputs.compressionLevel = parseInt(compressionLevelStr)
      if (isNaN(inputs.compressionLevel)) {
        core.setFailed('Invalid compression-level')
      }

      if (inputs.compressionLevel < 0 || inputs.compressionLevel > 9) {
        core.setFailed('Invalid compression-level. Valid values are 0-9')
      }
    }

    return inputs
  }

  return typedInputs(artifactPerFile)
}
