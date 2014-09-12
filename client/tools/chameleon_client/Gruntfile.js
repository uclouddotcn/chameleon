module.exports = function (grunt) {

    // Configure grunt here
    grunt.initConfig({
        ts: {
            build: {
                src: ["ts/**/*.ts"],
                outDir: 'ts',
                options: {
                    // 'es3' (default) | 'es5'
                    target: 'es5',
                    // 'amd' (default) | 'commonjs'
                    module: 'commonjs',
                    // true (default) | false
                    sourceMap: true,
                    // true | false (default)
                    declaration: false,
                    // true (default) | false
                    removeComments: true
                }
            },
            // a particular target
            dev: {
                src: ["ts/**/*.ts"],
                outDir: 'ts',
                options: {
                    // 'es3' (default) | 'es5'
                    target: 'es5',
                    module: 'commonjs',
                    // true (default) | false
                    sourceMap: true
                },
            }
        } 
    })

    // load the task
    grunt.loadNpmTasks("grunt-ts");

    grunt.registerTask("default", ["ts:build"]);
}
