import * as core from '@actions/core'
import artifact, {
  UploadArtifactOptions,
  ArtifactNotFoundError
} from '@actions/artifact'
import { findFilesToUpload } from '../shared/search'
import { getInputs } from './input-helper'
import { NoFileOptions } from './constants'
import { uploadArtifact } from '../shared/upload-artifact'
import { UploadInputs, UploadPerFile } from './upload-inputs'
import path from 'path'

async function deleteArtifactIfExists(artifactName: string): Promise<void> {
  try {
    await artifact.deleteArtifact(artifactName)
  } catch (error) {
    if (error instanceof ArtifactNotFoundError) {
      core.debug(`Skipping deletion of '${artifactName}', it does not exist`)
      return
    }

    // Best effort, we don't want to fail the action if this fails
    core.debug(`Unable to delete artifact: ${(error as Error).message}`)
  }
}

export async function run(): Promise<void> {
  const inputs: UploadInputs | UploadPerFile = getInputs()
  const searchResult = await findFilesToUpload(inputs.searchPath)
  if (searchResult.filesToUpload.length === 0) {
    // No files were found, different use cases warrant different types of behavior if nothing is found
    switch (inputs.ifNoFilesFound) {
      case NoFileOptions.warn: {
        core.warning(
          `No files were found with the provided path: ${inputs.searchPath}. No artifacts will be uploaded.`
        )
        break
      }
      case NoFileOptions.error: {
        core.setFailed(
          `No files were found with the provided path: ${inputs.searchPath}. No artifacts will be uploaded.`
        )
        break
      }
      case NoFileOptions.ignore: {
        core.info(
          `No files were found with the provided path: ${inputs.searchPath}. No artifacts will be uploaded.`
        )
        break
      }
    }
  } else {
    const s = searchResult.filesToUpload.length === 1 ? '' : 's'
    core.info(
      `With the provided path, there will be ${searchResult.filesToUpload.length} file${s} uploaded`
    )
    core.debug(`Root artifact directory is ${searchResult.rootDirectory}`)


    const options: UploadArtifactOptions = {}
    if (inputs.retentionDays) {
      options.retentionDays = inputs.retentionDays
    }

    if (typeof inputs.compressionLevel !== 'undefined') {
      options.compressionLevel = inputs.compressionLevel
    }

    const artifactPerFile = inputs['artifactPerFile'] || false

    // GitHub workspace
    let githubWorkspacePath = process.env['GITHUB_WORKSPACE'] || undefined
    if (!githubWorkspacePath) {
      core.warning('GITHUB_WORKSPACE not defined')
    } else {
      githubWorkspacePath = path.resolve(githubWorkspacePath)
      core.info(`GITHUB_WORKSPACE = '${githubWorkspacePath}'`)
    }

    const rootDirectory = searchResult.rootDirectory
    core.info('rootDirectory: ' + rootDirectory)

    if (!artifactPerFile) {
      if (inputs.overwrite) {
        await deleteArtifactIfExists((<UploadInputs>inputs).artifactName)
      }

      await uploadArtifact(
        (<UploadInputs>inputs).artifactName,
        searchResult.filesToUpload,
        searchResult.rootDirectory,
        options
      )
    } else {
      const filesToUpload = searchResult.filesToUpload
      const SuccessedItems: string[] = []

      const artifactNameRule = inputs['artifactNameRule']
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i]
        core.info('file: ' + file)

        const pathObject = Object.assign({}, path.parse(file))
        const pathBase = pathObject.base
        const pathRoot = githubWorkspacePath
          ? githubWorkspacePath
          : path.parse(rootDirectory).dir
        pathObject.root = pathRoot
        core.info('root: ' + pathRoot)

        pathObject['path'] = file.slice(
          pathRoot.length,
          file.length - path.sep.length - pathBase.length
        )
        core.info('path: ' + pathObject['path'])

        let artifactName = artifactNameRule
        for (const key of Object.keys(pathObject)) {
          const re = `$\{${key}}`
          if (artifactNameRule.includes(re)) {
            const value = pathObject[key] || ''
            artifactName = artifactName.replace(re, value)
          }
        }

        if (artifactName.startsWith(path.sep)) {
          core.warning(`${artifactName} startsWith ${path.sep}`)
          artifactName = artifactName.slice(path.sep.length)
        }
        if (artifactName.includes(':')) {
          core.warning(`${artifactName} includes :`)
          artifactName = artifactName.split(':').join('-')
        }
        if (artifactName.includes(path.sep)) {
          core.warning(`${artifactName} includes ${path.sep}`)
          artifactName = artifactName.split(path.sep).join('_')
        }
        core.debug(artifactName)

        const artifactItemExist = SuccessedItems.includes(artifactName)
        if (artifactItemExist) {
          const oldArtifactName = artifactName
          core.warning(`${artifactName} artifact alreay exist`)
          artifactName = `${i}__${artifactName}`
          core.warning(`${oldArtifactName} => ${artifactName}`)
        }

        if (inputs.overwrite) {
          await deleteArtifactIfExists(artifactName)
        }

        await uploadArtifact(
          artifactName,
          [file],
          rootDirectory,
          options
        )

        SuccessedItems.push(artifactName)
      }
    }

  }
}
