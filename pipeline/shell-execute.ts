import * as childProcess from "child_process"

export default function (
  description: string,
  command: string,
  args: ReadonlyArray<string>
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const process = childProcess.spawn(command, args, {
      shell: true
    })
    let stdout = ``
    let stdoutClosed = false

    let stderr = ``
    let stderrClosed = false

    let exitCode: null | number = null

    process.stdout.setEncoding(`utf8`)

    process.stdout.on(`data`, data => {
      stdout += data
    })

    process.stdout.on(`close`, () => {
      stdoutClosed = true
      checkDone()
    })

    process.stderr.on(`data`, data => {
      stderr += data
    })

    process.stderr.on(`close`, () => {
      stderrClosed = true
      checkDone()
    })

    process.on(`exit`, status => {
      exitCode = status
      checkDone()
    })

    function checkDone(): void {
      if (exitCode === null || !stdoutClosed || !stderrClosed) {
        return
      }
      if (exitCode === 0 && stderr === ``) {
        resolve(stdout)
      } else {
        reject(new Error(`Command-line execution failed;
\tDescription: ${JSON.stringify(description)}
\tCommand: ${JSON.stringify(command)}
\tArgs: ${JSON.stringify(args)}
\tExit code: ${exitCode}
\tStdout: ${JSON.stringify(stdout)})
\tStderr: ${JSON.stringify(stderr)})`)
        )
      }
    }
  })
}
