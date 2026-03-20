import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import yaml from 'yaml'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')

const TOOL_CONFIGS = {
  opencode: {
    links: [
      { source: '.agents/main.md', target: 'AGENTS.md' },
      { source: '.agents/skills', target: '.opencode/skills', type: 'symlink' },
      { source: '.agents/agents', target: '.opencode/agents', type: 'symlink' }
    ],
    generateFiles: [
      {
        source: '.agents/config.json',
        target: 'opencode.json',
        type: 'generate'
      }
    ],
    generateCommands: true
  },
  gemini: {
    links: [
      { source: 'AGENTS.md', target: 'GEMINI.md' },
      { source: '.agents/config.json', target: '.gemini/settings.json' },
      { source: '.agents/commands', target: '.gemini/commands' },
      { source: '.agents/skills', target: '.gemini/skills' },
      { source: '.agents/agents', target: '.gemini/agents', type: 'symlink' },
      { source: '.agents', target: '.gemini/agents' }
    ]
  },
  copilot: {
    links: [
      { source: 'AGENTS.md', target: '.github/copilot-instructions.md' },
      { source: '.agents/commands', target: '.github/commands' },
      { source: '.agents/skills', target: '.github/skills' },
      { source: '.agents/agents', target: '.github/agents', type: 'symlink' },
      { source: '.agents', target: '.github/agents' }
    ]
  }
}

/**
 * Converts MCP config from standard format to OpenCode format
 * Standard: { "mcpServers": { "name": { "command": "node", "args": [...] } } }
 * OpenCode: { "mcp": { "name": { "type": "local", "command": ["node", ...] } } }
 */
function convertMcpConfig(mcpConfig) {
  if (!mcpConfig || !mcpConfig.mcpServers) {
    return null
  }

  const converted = {}
  for (const [serverName, serverConfig] of Object.entries(
    mcpConfig.mcpServers
  )) {
    converted[serverName] = {
      type: 'local',
      command: [serverConfig.command, ...(serverConfig.args || [])]
    }
  }

  return converted
}

/**
 * Converts .agents/config.json to OpenCode's expected format
 */
function generateOpencodeJson(configJson) {
  const commands = {}

  // Convert commands to OpenCode command format
  if (configJson.commands) {
    for (const [commandName, commandConfig] of Object.entries(
      configJson.commands
    )) {
      commands[commandName] = {
        description: commandConfig.description || '',
        template: `Read the command definition at ${commandConfig.definition} and execute the instructions.`
      }
    }
  }

  const result = {
    $schema: 'https://opencode.ai/config.json',
    command: commands
  }

  // Add MCP config if present
  const mcpConfigPath = path.resolve(projectRoot, '.agents/mcp.json')
  if (fs.existsSync(mcpConfigPath)) {
    try {
      const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'))
      const convertedMcp = convertMcpConfig(mcpConfig)
      if (convertedMcp) {
        result.mcp = convertedMcp
      }
    } catch (error) {
      console.log(`  Warning: Failed to parse MCP config: ${error.message}`)
    }
  }

  return result
}

/**
 * Generates command markdown with tool-specific frontmatter
 */
function generateCommandMarkdown(sourcePath, tool, commandConfig) {
  const content = fs.readFileSync(sourcePath, 'utf-8')
  const body = content.replace(/^---[\s\S]*?---\n\n/, '')

  let frontmatter = {}
  switch (tool) {
    case 'opencode':
      frontmatter = {
        description: commandConfig.description,
        agent: commandConfig.agent || 'build'
      }
      break
    case 'gemini':
      frontmatter = { description: commandConfig.description }
      break
    case 'copilot':
      frontmatter = { description: commandConfig.description }
      break
    default:
      frontmatter = { description: commandConfig.description }
  }

  return `---\n${yaml.stringify(frontmatter)}---\n\n${body}`
}

/**
 * Generates command files for a specific tool
 */
function generateCommandsForTool(toolKey, commandsConfig) {
  const commandsDir = path.resolve(projectRoot, `.agents/commands`)
  const targetDir = path.resolve(projectRoot, `.opencode/commands`)

  ensureDirectoryExists(targetDir)

  for (const [commandName, commandConfig] of Object.entries(commandsConfig)) {
    const sourcePath = path.join(commandsDir, `${commandName}.md`)
    const targetPath = path.join(targetDir, `${commandName}.md`)

    if (!fs.existsSync(sourcePath)) {
      console.log(`  Warning: Source command file not found: ${sourcePath}`)
      continue
    }

    const generatedContent = generateCommandMarkdown(
      sourcePath,
      toolKey,
      commandConfig
    )

    fs.writeFileSync(targetPath, generatedContent)
    console.log(`  Generated: .opencode/commands/${commandName}.md`)
  }
}

function getPlatform() {
  const platform = process.platform
  if (platform === 'win32') {
    return 'windows'
  }
  return 'unix'
}

function getSymlinkType(sourcePath) {
  const platform = getPlatform()
  if (platform === 'windows') {
    const stats = fs.statSync(sourcePath)
    return stats.isDirectory() ? 'junction' : 'file'
  }
  return 'file'
}

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
}

function validateToolInput(input, validKeys) {
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) {
    return { valid: false, error: 'Input cannot be empty.' }
  }
  if (!validKeys.includes(trimmed)) {
    return {
      valid: false,
      error: `Invalid tool "${trimmed}". Available options: ${validKeys.join(', ')}`
    }
  }
  return { valid: true, value: trimmed }
}

function validateYesNo(input) {
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) {
    return { valid: false, error: 'Input cannot be empty.' }
  }
  const validOptions = ['y', 'yes', 'n', 'no']
  if (!validOptions.includes(trimmed)) {
    return {
      valid: false,
      error: `Invalid input "${trimmed}". Please enter y or n.`
    }
  }
  return { valid: true, value: trimmed.startsWith('y') }
}

function promptQuestion(rl, question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer)
    })
  })
}

async function getValidToolSelection(rl) {
  const availableTools = Object.keys(TOOL_CONFIGS)
  const optionsText = availableTools.map(t => `  - ${t}`).join('\n')

  while (true) {
    const input = await promptQuestion(
      rl,
      '\nAvailable AI tools:\n' +
        optionsText +
        '\n\nWhich AI tool do you want to use? '
    )

    const validation = validateToolInput(input, availableTools)

    if (validation.valid) {
      return validation.value
    }

    console.log(`\nError: ${validation.error}\n`)
  }
}

async function askForNestJsMcp(rl) {
  while (true) {
    const input = await promptQuestion(
      rl,
      '\nDo you want to configure NestJsMcp? (y/n): '
    )

    const validation = validateYesNo(input)

    if (validation.valid) {
      return validation.value
    }

    console.log(`\nError: ${validation.error}\n`)
  }
}

async function getNestJsMcpPath(rl) {
  while (true) {
    const input = await promptQuestion(
      rl,
      '\nEnter path to NestJsMcp (relative from project root, e.g., ./NestJsMcp/dist/index.js): '
    )

    const trimmed = input.trim()

    if (!trimmed) {
      console.log(
        '\nError: Path cannot be empty. Please enter the path to NestJsMcp.\n'
      )
      continue
    }

    const absolutePath = path.resolve(projectRoot, trimmed)

    if (!fs.existsSync(absolutePath)) {
      console.log(`\nError: Path does not exist: ${absolutePath}\n`)
      continue
    }

    console.log(`\nUsing NestJsMcp path: ${trimmed}`)
    return trimmed
  }
}

function ensureDirectoryExists(dirPath) {
  const fullPath = path.resolve(projectRoot, dirPath)
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true })
  }
}

function createSymlink(source, target) {
  const sourcePath = path.resolve(projectRoot, source)
  const targetPath = path.resolve(projectRoot, target)

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file does not exist: ${sourcePath}`)
  }

  const targetDir = path.dirname(targetPath)
  ensureDirectoryExists(targetDir)

  if (fs.existsSync(targetPath)) {
    const stats = fs.lstatSync(targetPath)
    if (stats.isSymbolicLink()) {
      fs.unlinkSync(targetPath)
      console.log(`  Removed existing symlink: ${target}`)
    } else {
      throw new Error(`Target exists and is not a symlink: ${targetPath}`)
    }
  }

  const symlinkType = getSymlinkType(sourcePath)
  fs.symlinkSync(sourcePath, targetPath, symlinkType)
  console.log(`  Created symlink: ${target} -> ${source}`)
}

function createSymlinksForTool(toolKey) {
  const config = TOOL_CONFIGS[toolKey]
  if (!config || !config.links) {
    throw new Error(`No configuration found for tool: ${toolKey}`)
  }

  console.log(`\nCreating folders, files and symlinks for "${toolKey}"...\n`)

  for (const link of config.links) {
    createSymlink(link.source, link.target)
  }

  // Generate files (like opencode.json from config.json)
  if (config.generateFiles) {
    for (const genFile of config.generateFiles) {
      generateFile(genFile.source, genFile.target)
    }
  }

  // Generate command files with tool-specific frontmatter
  if (config.generateCommands) {
    const configPath = path.resolve(projectRoot, '.agents/config.json')
    const commandsConfig = JSON.parse(
      fs.readFileSync(configPath, 'utf-8')
    ).commands
    generateCommandsForTool(toolKey, commandsConfig)
  }

  console.log(
    `\nSuccessfully created folders, files and symlinks for ${toolKey}`
  )
}

function generateFile(source, target) {
  const sourcePath = path.resolve(projectRoot, source)
  const targetPath = path.resolve(projectRoot, target)

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file does not exist: ${sourcePath}`)
  }

  const targetDir = path.dirname(targetPath)
  ensureDirectoryExists(targetDir)

  // Read the source config.json
  const sourceContent = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'))

  // Generate opencode.json format
  let generatedContent
  if (target === 'opencode.json') {
    generatedContent = generateOpencodeJson(sourceContent)
  } else {
    throw new Error(`Unknown generate target: ${target}`)
  }

  fs.writeFileSync(targetPath, JSON.stringify(generatedContent, null, 2))
  console.log(`  Generated: ${target}`)
}

function writeMcpConfig(nestjsMcpPath) {
  const mcpConfig = {
    mcpServers: {
      nestjs: {
        command: 'node',
        args: [nestjsMcpPath]
      }
    }
  }

  const mcpFilePath = path.resolve(projectRoot, '.agents/mcp.json')
  ensureDirectoryExists(path.dirname(mcpFilePath))

  fs.writeFileSync(mcpFilePath, JSON.stringify(mcpConfig, null, 2))
  console.log(`\nCreated MCP config from: .agents/mcp.json`)
}

async function main() {
  const platform = getPlatform()
  console.log(`Detected platform: ${platform}`)

  // Check for command-line arguments for non-interactive mode
  const args = process.argv.slice(2)
  let selectedTool = null
  let configureNestJsMcp = null
  let nestjsMcpPath = null

  if (args.length > 0) {
    // Non-interactive mode: node sync-agents.mjs <tool> [mcp-path]
    selectedTool = args[0]
    configureNestJsMcp = args[1] !== undefined
    nestjsMcpPath = args[1] || null
    console.log(`Running in non-interactive mode`)
    console.log(`Tool: ${selectedTool}`)
    console.log(`Configure MCP: ${configureNestJsMcp}`)
  } else {
    // Interactive mode
    const rl = createInterface()

    try {
      selectedTool = await getValidToolSelection(rl)
      configureNestJsMcp = await askForNestJsMcp(rl)

      if (configureNestJsMcp) {
        nestjsMcpPath = await getNestJsMcpPath(rl)
      }
    } catch (error) {
      rl.close()
      throw error
    }
    rl.close()
  }

  try {
    createSymlinksForTool(selectedTool)

    if (configureNestJsMcp && nestjsMcpPath) {
      writeMcpConfig(nestjsMcpPath)
    }

    console.log(`\n=== Setup Complete ===`)
    console.log(`AI Tool: ${selectedTool}`)
    console.log(`NestJsMcp: ${configureNestJsMcp ? nestjsMcpPath : 'Skipped'}`)
  } catch (error) {
    console.error(`\nError: ${error.message}`)
    process.exit(1)
  }
}

main()
