module.exports = function (grunt) {
    var destiny = "..\\..\\chameleon_build\\chameleon_client_win\\chameleon_client";
    grunt.initConfig({
        shell:{
            rebuildSqlite3: {
                command: "npm install sqlite3 --build-from-source --runtime=node-webkit --target_arch=ia32 --target=0.8.6"
            },
            pack: {
                command: "robocopy ..\\chameleon_client " + destiny + " /mir /xd node_modules",
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
