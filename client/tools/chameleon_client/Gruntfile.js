module.exports = function (grunt) {
    grunt.initConfig({
        shell:{
            rebuildSqlite3: {
                command: "npm install sqlite3 --build-from-source --runtime=node-webkit --target_arch=ia32 --target=0.8.6"
            },
            pack: {
                command: "robocopy ..\\chameleon_client ..\\..\\chameleon_build\\chameleon\\nw\\chameleon_client /mir",
                options: {
                    execOptions: {
                        maxBuffer: Infinity
                    }
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-npm-install');
    grunt.loadNpmTasks("grunt-bower-install-task");
    grunt.loadNpmTasks('grunt-shell');

    grunt.registerTask('default', ['npm-install', 'bower_install', 'shell:rebuildSqlite3']);
    grunt.registerTask('pack', ['shell:pack']);
}
