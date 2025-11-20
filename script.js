document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('manifest-form');
    const jsonPreview = document.getElementById('json-preview');
    const copyButton = document.getElementById('copy-button');

    /**
     * 解析多行文本为数组，过滤空行
     * @param {string} value - 输入的多行文本
     * @returns {Array} 解析后的数组
     */
    const parseMultilineToArray = (value) => {
        if (!value.trim()) return null;
        return value.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    };

    /**
     * 解析环境变量设置
     * @param {string} value - 环境变量设置文本
     * @returns {Object|null} 环境变量对象
     */
    const parseEnvSet = (value) => {
        if (!value.trim()) return null;
        const envObj = {};
        value.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed) {
                const [key, ...valueParts] = trimmed.split('=');
                if (key && valueParts.length > 0) {
                    envObj[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
        return Object.keys(envObj).length > 0 ? envObj : null;
    };

    /**
     * 解析建议安装包
     * @param {string} value - 建议安装文本
     * @returns {Object|null} 建议安装对象
     */
    const parseSuggest = (value) => {
        if (!value.trim()) return null;
        const suggestObj = {};
        value.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed) {
                const colonIndex = trimmed.indexOf(':');
                if (colonIndex > 0) {
                    const key = trimmed.substring(0, colonIndex).trim();
                    const val = trimmed.substring(colonIndex + 1).trim();
                    if (key && val) {
                        suggestObj[key] = val;
                    }
                }
            }
        });
        return Object.keys(suggestObj).length > 0 ? suggestObj : null;
    };

    /**
     * 解析bin字段，支持简单字符串和复杂数组格式
     * @param {string} value - bin字段文本
     * @returns {Array|string|null} 解析后的bin值
     */
    const parseBin = (value) => {
        if (!value.trim()) return null;
        const lines = parseMultilineToArray(value);
        if (!lines) return null;

        if (lines.length === 1) {
            const line = lines[0];
            if (line.includes(',')) {
                // 包含逗号，解析为数组格式
                const parts = line.split(',').map(p => p.trim());
                return parts.length > 1 ? parts : line;
            }
            return line;
        }

        // 多行，每行可能是简单字符串或数组格式
        return lines.map(line => {
            if (line.includes(',')) {
                const parts = line.split(',').map(p => p.trim());
                return parts.length > 1 ? parts : line;
            }
            return line;
        });
    };

    /**
     * 解析shortcuts字段
     * @param {string} value - shortcuts字段文本
     * @returns {Array|null} 解析后的shortcuts数组
     */
    const parseShortcuts = (value) => {
        if (!value.trim()) return null;
        const lines = parseMultilineToArray(value);
        if (!lines) return null;

        return lines.map(line => {
            // 尝试解析JSON数组格式
            if (line.startsWith('[') && line.endsWith(']')) {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    // 解析失败，按逗号分割
                }
            }
            // 按逗号分割
            return line.split(',').map(p => p.trim()).filter(p => p);
        });
    };

    /**
     * 更新JSON预览
     */
    const updateJson = () => {
        const manifest = {};

        // 按照指定顺序构建manifest对象
        // 1. version
        const version = document.getElementById('version').value.trim();
        if (version) manifest.version = version;

        // 2. description
        const description = document.getElementById('description').value.trim();
        if (description) manifest.description = description;

        // 3. homepage
        const homepage = document.getElementById('homepage').value.trim();
        if (homepage) manifest.homepage = homepage;

        const license = document.getElementById('license').value.trim();
        const url = document.getElementById('url').value.trim();
        const hash = document.getElementById('hash').value.trim();

        // 4. license
        const licenseAdvanced = document.getElementById('license_advanced').checked;
        if (licenseAdvanced) {
            const licenseIdentifier = document.getElementById('license_identifier').value.trim();
            const licenseUrl = document.getElementById('license_url').value.trim();

            if (licenseIdentifier || licenseUrl) {
                const licenseObj = {};
                if (licenseIdentifier) licenseObj.identifier = licenseIdentifier;
                if (licenseUrl) licenseObj.url = licenseUrl;
                manifest.license = licenseObj;
            } else if (license) {
                manifest.license = license;
            }
        } else if (license) {
            manifest.license = license;
        }
        // 5. architecture (如果启用多架构)
        const enableArchitecture = document.getElementById('enable_architecture').checked;
        if (enableArchitecture) {
            const architecture = {};

            // 64位架构
            const arch64Url = document.getElementById('arch_64_url').value.trim();
            const arch64Hash = document.getElementById('arch_64_hash').value.trim();
            const arch64ExtractDir = document.getElementById('arch_64_extract_dir').value.trim();

            if (arch64Url || arch64Hash || arch64ExtractDir) {
                architecture['64bit'] = {};
                if (arch64Url) architecture['64bit'].url = arch64Url;
                if (arch64Hash) architecture['64bit'].hash = arch64Hash;
                if (arch64ExtractDir) architecture['64bit'].extract_dir = arch64ExtractDir;

                const arch64ExtractTo = document.getElementById('arch_64_extract_to').value.trim();
                if (arch64ExtractTo) architecture['64bit'].extract_to = arch64ExtractTo;
            }

            // 32位架构
            const arch32Url = document.getElementById('arch_32_url').value.trim();
            const arch32Hash = document.getElementById('arch_32_hash').value.trim();
            const arch32ExtractDir = document.getElementById('arch_32_extract_dir').value.trim();

            if (arch32Url || arch32Hash || arch32ExtractDir) {
                architecture['32bit'] = {};
                if (arch32Url) architecture['32bit'].url = arch32Url;
                if (arch32Hash) architecture['32bit'].hash = arch32Hash;
                if (arch32ExtractDir) architecture['32bit'].extract_dir = arch32ExtractDir;

                const arch32ExtractTo = document.getElementById('arch_32_extract_to').value.trim();
                if (arch32ExtractTo) architecture['32bit'].extract_to = arch32ExtractTo;
            }

            // ARM64架构
            const archArm64Url = document.getElementById('arch_arm64_url').value.trim();
            const archArm64Hash = document.getElementById('arch_arm64_hash').value.trim();
            const archArm64ExtractDir = document.getElementById('arch_arm64_extract_dir').value.trim();

            if (archArm64Url || archArm64Hash || archArm64ExtractDir) {
                architecture['arm64'] = {};
                if (archArm64Url) architecture['arm64'].url = archArm64Url;
                if (archArm64Hash) architecture['arm64'].hash = archArm64Hash;
                if (archArm64ExtractDir) architecture['arm64'].extract_dir = archArm64ExtractDir;

                const archArm64ExtractTo = document.getElementById('arch_arm64_extract_to').value.trim();
                if (archArm64ExtractTo) architecture['arm64'].extract_to = archArm64ExtractTo;
            }

            if (Object.keys(architecture).length > 0) {
                manifest.architecture = architecture;
            }
        } else {
            // 单架构模式下添加url和hash
            if (url) manifest.url = url;
            if (hash) manifest.hash = hash;
        }

        // 6. bin
        const bin = parseBin(document.getElementById('bin').value);
        if (bin) manifest.bin = bin;

        // 7. checkver
        const checkverSimpleMode = document.getElementById('checkver_simple_mode').checked;
        if (checkverSimpleMode) {
            manifest.checkver = "github";
        } else {
            const checkverUrl = document.getElementById('checkver_url').value.trim();
            const checkverRegex = document.getElementById('checkver_regex').value.trim();
            if (checkverUrl && checkverRegex) {
                manifest.checkver = {
                    url: checkverUrl,
                    regex: checkverRegex
                };
            }
        }

        // 8. autoupdate
        if (enableArchitecture) {
            // 多架构模式
            const autoupdate64bitUrl = document.getElementById('autoupdate_64bit_url').value.trim();
            const autoupdate32bitUrl = document.getElementById('autoupdate_32bit_url').value.trim();
            const autoupdateArm64Url = document.getElementById('autoupdate_arm64_url').value.trim();

            if (autoupdate64bitUrl || autoupdate32bitUrl || autoupdateArm64Url) {
                const autoupdate = { architecture: {} };

                if (autoupdate64bitUrl) {
                    autoupdate.architecture['64bit'] = { url: autoupdate64bitUrl };
                }
                if (autoupdate32bitUrl) {
                    autoupdate.architecture['32bit'] = { url: autoupdate32bitUrl };
                }
                if (autoupdateArm64Url) {
                    autoupdate.architecture['arm64'] = { url: autoupdateArm64Url };
                }

                manifest.autoupdate = autoupdate;
            }
        } else {
            // 单架构模式
            const autoupdateUrl = document.getElementById('autoupdate_url').value.trim();
            if (autoupdateUrl) {
                manifest.autoupdate = { url: autoupdateUrl };
            }
        }

        // 其他字段（按原有逻辑处理）

        // 单架构模式下的extract_dir
        // 单架构模式下的extract_dir和extract_to
        if (!enableArchitecture) {
            const extractDir = document.getElementById('extract_dir').value.trim();
            if (extractDir) manifest.extract_dir = extractDir;

            const extractTo = document.getElementById('extract_to').value.trim();
            if (extractTo) manifest.extract_to = extractTo;
        }

        // 快捷方式和持久化
        const enableShortcutsPersist = document.getElementById('enable_shortcuts_persist').checked;
        if (enableShortcutsPersist) {
            const shortcuts = parseShortcuts(document.getElementById('shortcuts').value);
            if (shortcuts) manifest.shortcuts = shortcuts;

            const persist = parseMultilineToArray(document.getElementById('persist').value);
            if (persist) manifest.persist = persist;
        }

        // 依赖管理
        const enableDependencies = document.getElementById('enable_dependencies').checked;
        if (enableDependencies) {
            const depends = parseMultilineToArray(document.getElementById('depends').value);
            if (depends) manifest.depends = depends;

            const suggest = parseSuggest(document.getElementById('suggest').value);
            if (suggest) manifest.suggest = suggest;
        }

        // 环境变量
        const enableEnvironment = document.getElementById('enable_environment').checked;
        if (enableEnvironment) {
            const envAddPath = parseMultilineToArray(document.getElementById('env_add_path').value);
            if (envAddPath) manifest.env_add_path = envAddPath;

            const envSet = parseEnvSet(document.getElementById('env_set').value);
            if (envSet) manifest.env_set = envSet;
        }

        // 安装器设置
        const enableInstaller = document.getElementById('enable_installer').checked;
        if (enableInstaller) {
            const innosetup = document.getElementById('innosetup').checked;
            if (innosetup) manifest.innosetup = true;

            const installerScript = parseMultilineToArray(document.getElementById('installer_script').value);
            if (installerScript) {
                manifest.installer = {
                    script: installerScript.length === 1 ? installerScript[0] : installerScript
                };
            }

            const preInstall = parseMultilineToArray(document.getElementById('pre_install').value);
            if (preInstall) manifest.pre_install = preInstall.length === 1 ? preInstall[0] : preInstall;

            const postInstall = parseMultilineToArray(document.getElementById('post_install').value);
            if (postInstall) manifest.post_install = postInstall.length === 1 ? postInstall[0] : postInstall;
        }

        // 卸载器设置
        const enableUninstaller = document.getElementById('enable_uninstaller').checked;
        if (enableUninstaller) {
            const uninstallerScript = parseMultilineToArray(document.getElementById('uninstaller_script').value);
            if (uninstallerScript) {
                manifest.uninstaller = {
                    script: uninstallerScript.length === 1 ? uninstallerScript[0] : uninstallerScript
                };
            }

            const preUninstall = parseMultilineToArray(document.getElementById('pre_uninstall').value);
            if (preUninstall) manifest.pre_uninstall = preUninstall.length === 1 ? preUninstall[0] : preUninstall;

            const postUninstall = parseMultilineToArray(document.getElementById('post_uninstall').value);
            if (postUninstall) manifest.post_uninstall = postUninstall.length === 1 ? postUninstall[0] : postUninstall;
        }



        // 其他设置
        const enableMisc = document.getElementById('enable_misc').checked;
        if (enableMisc) {
            const notes = parseMultilineToArray(document.getElementById('notes').value);
            if (notes) manifest.notes = notes.length === 1 ? notes[0] : notes;
        }



        jsonPreview.textContent = JSON.stringify(manifest, null, 4);
    };

    /**
     * 切换高级许可证部分的显示/隐藏
     */
    const toggleLicenseSection = () => {
        const licenseAdvanced = document.getElementById('license_advanced');
        const licenseAdvancedSection = document.getElementById('license_advanced_section');
        const licenseSimpleSection = document.getElementById('license_simple_section');

        licenseAdvanced.addEventListener('change', () => {
            if (licenseAdvanced.checked) {
                licenseAdvancedSection.style.display = 'block';
                if (licenseSimpleSection) licenseSimpleSection.style.display = 'none';
            } else {
                licenseAdvancedSection.style.display = 'none';
                if (licenseSimpleSection) licenseSimpleSection.style.display = 'block';
            }
            updateJson();
        });
    };

    /**
     * 切换checkver模式的显示/隐藏
     */
    const toggleCheckverSection = () => {
        const checkverSimpleMode = document.getElementById('checkver_simple_mode');
        const checkverAdvancedSection = document.getElementById('checkver_advanced_section');

        checkverSimpleMode.addEventListener('change', () => {
            if (checkverSimpleMode.checked) {
                checkverAdvancedSection.style.display = 'none';
            } else {
                checkverAdvancedSection.style.display = 'block';
            }
            updateJson();
        });
    };

    /**
     * 切换单架构和多架构模式的显示
     */
    const toggleArchitectureSections = () => {
        const enableArchitecture = document.getElementById('enable_architecture');

        enableArchitecture.addEventListener('change', () => {
            const singleArchSection = document.getElementById('single_arch_section');
            const singleArchInstallSection = document.getElementById('single_arch_install_section');
            const architectureSection = document.getElementById('architecture_section');
            const singleArchAutoupdateSection = document.getElementById('single_arch_autoupdate_section');
            const multiArchAutoupdateSection = document.getElementById('multi_arch_autoupdate_section');

            if (enableArchitecture.checked) {
                if (singleArchSection) singleArchSection.style.display = 'none';
                if (singleArchInstallSection) singleArchInstallSection.style.display = 'none';
                if (architectureSection) architectureSection.style.display = 'block';
                if (singleArchAutoupdateSection) singleArchAutoupdateSection.style.display = 'none';
                if (multiArchAutoupdateSection) multiArchAutoupdateSection.style.display = 'block';
            } else {
                if (singleArchSection) singleArchSection.style.display = 'block';
                if (singleArchInstallSection) singleArchInstallSection.style.display = 'block';
                if (architectureSection) architectureSection.style.display = 'none';
                if (singleArchAutoupdateSection) singleArchAutoupdateSection.style.display = 'block';
                if (multiArchAutoupdateSection) multiArchAutoupdateSection.style.display = 'none';
            }
            updateJson();
        });
    };

    /**
     * 切换可选功能区域的显示/隐藏
     */
    const toggleOptionalSections = () => {
        // 快捷方式和持久化
        const enableShortcutsPersist = document.getElementById('enable_shortcuts_persist');
        if (enableShortcutsPersist) {
            enableShortcutsPersist.addEventListener('change', () => {
                const shortcutsPersistSection = document.getElementById('shortcuts_persist_section');
                if (shortcutsPersistSection) {
                    shortcutsPersistSection.style.display = enableShortcutsPersist.checked ? 'block' : 'none';
                }
                updateJson();
            });
        }

        // 依赖管理
        const enableDependencies = document.getElementById('enable_dependencies');
        if (enableDependencies) {
            enableDependencies.addEventListener('change', () => {
                const dependenciesSection = document.getElementById('dependencies_section');
                if (dependenciesSection) {
                    dependenciesSection.style.display = enableDependencies.checked ? 'block' : 'none';
                }
                updateJson();
            });
        }

        // 环境变量
        const enableEnvironment = document.getElementById('enable_environment');
        if (enableEnvironment) {
            enableEnvironment.addEventListener('change', () => {
                const environmentSection = document.getElementById('environment_section');
                if (environmentSection) {
                    environmentSection.style.display = enableEnvironment.checked ? 'block' : 'none';
                }
                updateJson();
            });
        }

        // 安装器设置
        const enableInstaller = document.getElementById('enable_installer');
        if (enableInstaller) {
            enableInstaller.addEventListener('change', () => {
                const installerSection = document.getElementById('installer_section');
                if (installerSection) {
                    installerSection.style.display = enableInstaller.checked ? 'block' : 'none';
                }
                updateJson();
            });
        }

        // 其他设置
        const enableMisc = document.getElementById('enable_misc');
        if (enableMisc) {
            enableMisc.addEventListener('change', () => {
                const miscSection = document.getElementById('misc_section');
                if (miscSection) {
                    miscSection.style.display = enableMisc.checked ? 'block' : 'none';
                }
                updateJson();
            });
        }

        // 卸载器设置
        const enableUninstaller = document.getElementById('enable_uninstaller');
        if (enableUninstaller) {
            enableUninstaller.addEventListener('change', () => {
                const uninstallerSection = document.getElementById('uninstaller_section');
                if (uninstallerSection) {
                    uninstallerSection.style.display = enableUninstaller.checked ? 'block' : 'none';
                }
                updateJson();
            });
        }


    };

    form.addEventListener('input', updateJson);

    document.getElementById('enable_architecture').addEventListener('change', updateJson);
    document.getElementById('license_advanced').addEventListener('change', updateJson);
    document.getElementById('checkver_simple_mode').addEventListener('change', updateJson);

    const toggleElements = ['enable_shortcuts_persist', 'enable_dependencies', 'enable_environment', 'enable_installer', 'enable_uninstaller', 'enable_misc'];
    toggleElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', updateJson);
        }
    });

    document.getElementById('checkver_url').addEventListener('input', updateJson);
    document.getElementById('checkver_regex').addEventListener('input', updateJson);

    ['arch_64_url', 'arch_64_hash', 'arch_64_extract_dir', 'arch_64_extract_to',
        'arch_32_url', 'arch_32_hash', 'arch_32_extract_dir', 'arch_32_extract_to',
        'arch_arm64_url', 'arch_arm64_hash', 'arch_arm64_extract_dir', 'arch_arm64_extract_to',
        'autoupdate_url', 'autoupdate_64bit_url', 'autoupdate_32bit_url', 'autoupdate_arm64_url', 'license_identifier', 'license_url', 'bin', 'extract_to'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', updateJson);
            }
        });

    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(jsonPreview.textContent)
            .then(() => {
                showToast('已复制到剪贴板!');
            })
            .catch(err => {
                console.error('无法复制文本: ', err);
                showToast('复制失败', true);
            });
    });

    function showToast(message, isError = false) {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast show';
        if (isError) {
            toast.style.backgroundColor = '#dc3545';
        }
        toast.textContent = message;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toastContainer.removeChild(toast);
            }, 300);
        }, 3000);
    }

    // 初始化
    toggleLicenseSection();
    toggleArchitectureSections();
    toggleOptionalSections();
    toggleCheckverSection();
    updateJson();
});