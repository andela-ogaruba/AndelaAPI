'use strict';
/*****
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Instructor = mongoose.model('Instructor'),
    Applicant = mongoose.model('Applicant'),
    User = mongoose.model('User'),
    Test = mongoose.model('Test'),
    Question = mongoose.model('Question'),
    Bootcamp = mongoose.model('Bootcamp'),
    Options = mongoose.model('Options'),
    Placement = mongoose.model('Placement'),
    SkillCategory = mongoose.model('SkillCategory'),
    Skill = mongoose.model('Skill'),
    async = require('async'),
    path = require('path'),
    fs = require('fs'),
    _ = require('lodash'),
    instructor = require('../../app/controllers/instructor');

/**
 * Create users
 */
exports.createUsers = function(req, res, next) {
    var instructor = new Instructor(req.body);
    instructor.provider = 'local';

    if (req.body.role !== 'instructor' && req.body.role !== 'admin') {
        res.send(400, {
            message: 'Error: Only admin or instructors can be created'
        });
    } else {
        instructor.save(function(err) {

            // Remove sensitive data before login
            instructor.password = undefined;
            instructor.salt = undefined;
            if (err) {
                res.send(400, {
                    message: err
                });
            } else {
                res.jsonp(instructor);
            }
        });
    }
};

/**
 * Change applicant's status
 */
exports.changeStatus = function(req, res) {
    var applicant = req.applicant;

    if (req.body.status.name === 'rejected') {
        if (!req.body.status.reason || req.body.status.reason.length === 0) {
            res.send(400, {
                message: 'Please give reason why applicant was rejected'
            });
        }
    }

    if (req.body.status.name === 'selected for bootcamp') {
        applicant.role = 'trainee';
    }

    if (applicant.role === 'trainee' && req.body.status.name !== 'selected for bootcamp') {
        applicant.role = 'applicant';
    }

    if (req.body.status.reason) {
        applicant.status.reason = req.body.status.reason;
    } else {
        applicant.status.reason = '';
    }

    applicant.status.name = req.body.status.name;

    Applicant.update({
            _id: req.params.applicantId
        }, {
            $set: {
                'role': applicant.role,
                'status.name': applicant.status.name,
                'status.reason': applicant.status.reason
            }
        },
        function(err) {
            if (err) {
                res.send(500, {
                    message: err
                });
            } else {
                instructor.returnJson(res, applicant._id);
            }
        }
    );
};

/**
 * Edit Applicants name or email
 */
exports.updateApplicantDetails = function(req, res) {
    var applicant = req.applicant;
    applicant = _.extend(applicant, req.body);

    Applicant.update({
            _id: req.params.applicantId
        }, {
            $set: {
                'firstName': applicant.firstName,
                'lastName': applicant.lastName,
                'email': applicant.email
            }
        },
        function(err) {
            if (err) {
                res.send(500, {
                    message: err
                });
            } else {
                instructor.returnJson(res, applicant._id);
            }
        }
    );
};

/**
 * Change applicant's role
 */
exports.changeRole = function(req, res) {
    var applicant = req.applicant;
    var role = req.body.role;

    if (role === 'instructor' || role === 'admin') {
        res.send(400, {
            message: 'you cannot change user to an admin or instructor'
        });
    } else {
        applicant = _.extend(applicant, req.body);
        if (role === 'applicant') {
            applicant.status.name = 'selected for interview';
            applicant.status.reason = '';
        }

        if (role === 'trainee' || role === 'fellow') {
            applicant.status.name = 'selected for bootcamp';
            applicant.status.reason = '';
        }

        Applicant.update({
                _id: applicant._id
            }, {
                $set: {
                    'role': applicant.role,
                    'status': {
                        name: applicant.status.name,
                        reason: applicant.status.reason
                    }
                }
            },
            function(err) {
                if (err) {
                    res.send(500, {
                        message: 'operation failed'
                    });
                } else {
                    instructor.returnJson(res, applicant._id);
                }
            }
        );
    }
};

/**
 * Change instructor and admin's role
 */
exports.changeInstrRole = function(req, res) {
    var instructor = req.instructor;

    if (req.body.role !== 'instructor' && req.body.role !== 'admin') {
        res.send(400, {
            message: 'user\'s role can only be changed to admin or instructor'
        });
    } else {
        instructor = _.extend(instructor, req.body);

        Instructor.update({
                _id: instructor._id
            }, {
                $set: {
                    'role': instructor.role
                }
            },
            function(err) {
                if (err) {
                    res.send(500, {
                        message: 'error occurred while trying to change role'
                    });
                } else {
                    instructor.returnJson(res, instructor._id);
                }
            }
        );
    }
};

/**
 * Delete User
 */
exports.deleteUser = function(req, res) {
    var person = req.profile;

    if (person._type === 'Instructor' && person.role === 'admin') {
        res.send(400, {
            message: 'You cannot delete another admin'
        });
    } else {
        person.remove(function(err, user) {
            if (err) {
                res.send(500, {
                    message: 'could not delete user'
                });
            } else {
                res.jsonp(user);
            }
        });
    }
};

/**
 * Create bootcamp
 */
exports.createBootCamp = function(req, res) {
    var camp = new Bootcamp(req.body);

    camp.save(function(err) {
        if (err) {
            res.send(500, {
                message: 'bootcamp could not be created at this time'
            });
        } else {
            res.jsonp(camp);
        }
    });
};

/**
 * List all Bootcamps
 */
exports.bootCamps = function(req, res) {
    Bootcamp.find().sort('-start_date').populate('applicants').exec(function(err, camps) {
        if (err) {
            res.send(500, {
                message: 'Could not find bootcamps'
            });
        } else { 
            res.jsonp(camps);
        }
    });
};

/**
 * Edit bootcamp details
 */
exports.editCamp = function(req, res) {
    var camp = req.camp;

    camp = _.extend(camp, req.body);

    Bootcamp.update({
            _id: camp._id
        }, {
            $set: {
                'camp_name': camp.camp_name,
                'start_date': camp.start_date,
                'end_date': camp.end_date
            }
        },
        function(err) {
            if (err) {
                res.send(500, {
                    message: 'could not edit camp'
                });
            } else {
                instructor.jsonCamp(res, camp._id);
            }
        }
    );
};

/**
 * Delete bootcamp
 */
exports.deleteCamp = function(req, res) {
    var camp = req.camp;

    async.waterfall([
            function(callback) {
                camp.remove(function(err, camp) {
                    if (err) {
                        var message = 'Couldn\'t delete camp.';
                        return callback(message);
                    }
                    callback(null, camp);
                });
            },
            function(camp, callback) {
                Applicant.find().where({
                    campId: camp._id
                }).exec(function(err, user) {
                    if (err) {
                        var message = 'Couldn\'t delete user.';
                        return callback(message);
                    } else {
                        for (var i in user) {
                            if (fs.existsSync(user[i].cvPath)) {
                                fs.unlink(user[i].cvPath);
                            }

                            if (fs.existsSync(user[i].photo_path)) {
                                fs.unlink(user[i].photo_path);
                            }
                            user[i].remove();
                        }
                        callback(null, camp);
                    }
                });
            }
        ],
        function(err, results) {
            if (err) {
                res.send(500, {
                    message: err
                });
            } else {
                res.jsonp(req.camp);
            }
        });
};

/**
 * Show the current bootcamp
 */
exports.read = function(req, res) {
    res.jsonp(req.camp);
};

/**
 * Show the current applicant/trainee/fellow
 */
exports.applicantRead = function(req, res) {
    res.jsonp(req.applicant);
};

/**
 * Show the current instructor/admin
 */
exports.instructorRead = function(req, res) {
    res.jsonp(req.instructor);
};

var doListing = function(req, res, schema, whichRole) {
    if (schema === 'Applicant') {
        Applicant.find().where({
            role: whichRole
        }).populate('campId').populate('placements').exec(function(err, users) {
            if (err) {
                res.send(400, {
                    message: 'No ' + whichRole + ' found'
                });
            } else {
                Placement.populate(users.placements, {
                    path: 'placement'
                }, function(err, data) {
                    res.jsonp(users);
                });
            }
        });
    } else {
        Instructor.find().where({
            role: whichRole
        }).exec(function(err, users) {
            if (err) {
                res.send(500, {
                    message: 'No ' + whichRole + ' found'
                });
            } else {
                res.jsonp(users);
            }
        });
    }
};

/**
 * List applicants
 */
exports.listApplicants = function(req, res) {
    doListing(req, res, 'Applicant', 'applicant');
};

/**
 * List fellows
 */
exports.listFellows = function(req, res) {
    doListing(req, res, 'Applicant', 'fellow');
};

/**
 * List Trainees
 */
exports.listTrainees = function(req, res) {
    doListing(req, res, 'Applicant', 'trainee');
};

/**
 * List Instructors
 */
exports.listInstructors = function(req, res) {
    doListing(req, res, 'Instructor', 'instructor');
};

/**
 * List Admins
 */
exports.listAdmins = function(req, res) {
    doListing(req, res, 'Instructor', 'admin');
};

/**
 * Create tests
 */
exports.createTests = function(req, res) {
    var quest = req.body.questions;
    var questions = [];

    for (var i = 0; i < quest.length; i++) {
        var optionArr = [];
        var answerArr = [];
        if (i === 0) {
            var options = req.body.optionOne;
            var chosenAnswer = req.body.answerOne;
        } else {
            var options = req.body.optionTwo;
            var chosenAnswer = req.body.answerTwo;
        }

        for (var j = 0; j < options.length; j++) {
            if (j === parseInt(chosenAnswer, 10)) {
                answerArr[j] = true;
            } else {
                answerArr[j] = false;
            }
            var eachOpt = new Options({
                option: options[j],
                answer: answerArr[j]
            });
            optionArr.push(eachOpt);
        }

        var each = new Question({
            question: quest[i],
            questOptions: optionArr
        });
        questions.push(each);
    }

    var test = new Test({
        testName: req.body.testName,
        questions: questions
    });
    test.save(function(err) {
        if (err) {
            res.send(500, {
                message: err
            });
        } else {
            res.jsonp(test);
        }
    });
};

/**
 * Update a particular test's name
 */
exports.updateTestName = function(req, res) {
    var test = req.test;
    test = _.extend(test, req.body);

    test.save(function(err) {
        if (err) {
            res.send(500, {
                message: err
            });
        } else {
            res.jsonp(test);
        }
    });
};

/**
 * Update Question and Option
 */
exports.updateQuestion = function(req, res) {
    var question = req.question;
    question = _.extend(question, req.body);

    req.test.save(function(err, test) {
        if (err) {
            res.send(500, {
                message: 'Error: couldn\'t update question'
            });
        } else {
            res.jsonp(test);
        }
    });
};

/**
 * Add question to already existing test
 */
exports.addQuestion = function(req, res) {
    var quest = req.body.question,
        test = req.test,
        options = req.body.option,
        optionArr = [],
        answerArr = [];

    for (var j = 0; j < options.length; j++) {
        if (j === parseInt(req.body.answer, 10)) {
            answerArr[j] = true;
        } else {
            answerArr[j] = false;
        }

        var eachOpt = new Options({
            option: options[j],
            answer: answerArr[j]
        });
        optionArr.push(eachOpt);
    }

    var each = new Question({
        question: quest,
        questOptions: optionArr
    });
    test.questions.push(each);

    test.save(function(err, test) {
        if (err) {
            res.send(500, {
                message: err
            });
        } else {
            res.jsonp(test);
        }
    });
};

/**
 * Add new option to a question
 */
exports.addOption = function(req, res) {
    var test = req.test,
        question = req.question,
        option = req.body.option;

    question.questOptions.push(new Options({
        option: option,
        answer: false
    }));
    test.save(function(err, test) {
        if (err) {
            res.send(500, {
                message: err
            });
        } else {
            res.jsonp(test);
        }
    });
};

/**
 * Delete tests
 */
exports.deleteTest = function(req, res) {
    var test = req.test;

    test.remove(function(err) {
        if (err) {
            res.send(500, {
                message: 'Couldn\'t delete test'
            });
        } else {
            res.jsonp(test);
        }
    });
};

/**
 * Delete a question
 */
exports.deleteQuestion = function(req, res, next) {
    var test = req.test,
        question = req.question;

    question.remove();
    test.save(function(err) {
        if (err) {
            res.send(500, {
                message: 'Couldn\'t delete question'
            });
        } else {
            res.jsonp(test);
        }
    });
};

/**
 * Delete an option
 */
exports.deleteOption = function(req, res) {
    var test = req.test,
        question = req.question,
        id = req.params.optionId;

    var option = question.questOptions.id(id);
    if (question.questOptions.length === 2) {
        res.send(400, {
            message: 'A question can only have a minimum of two options'
        });
    } else if (option.answer === true) {
        res.send(400, {
            message: 'This option is the answer to the question. Change the answer before deleting it'
        });
    } else {
        option.remove();
        test.save(function(err, test) {
            if (err) {
                res.send(500, {
                    message: 'Couldn\'t delete option'
                });
            } else {
                res.jsonp(test);
            }
        });
    }
};

/**
 * Update placement status
 */
exports.placementStatus = function(req, res) {
    var profile = req.profile;

    if (profile.role === 'fellow') {
        Applicant.update({
                _id: profile._id
            }, {
                $set: {
                    'currPlacement': {
                        'status': req.body.status,
                        'startDate': req.body.startDate,
                        'endDate': req.body.endDate
                    }
                }
            },
            function(err) {
                if (err) {
                    res.send(400, {
                        message: 'Couldn\'t save placement status'
                    });
                } else {
                    instructor.returnJson(res, profile._id);
                }
            }
        );
    } else {
        res.send(400, {
            message: 'Only a fellow\'s placement status can be updated'
        });
    }
};

/**
 * Admin adds fellow's work history
 */
exports.addPlacement = function(req, res) {
    var profile = req.profile,
        company = req.body.company;

    if (profile.role === 'fellow') {
        var placement = new Placement(req.body);

        placement.save(function(err, result) {
            if (err) {
                res.send(400, {
                    message: 'Couldn\'t add placement'
                });
            } else {
                Applicant.update({
                        _id: profile._id
                    }, {
                        $push: {
                            'placements': result
                        }
                    },
                    function(error) {
                        if (error) {
                            res.send(400, {
                                message: 'Couldn\'t save work history'
                            });
                        } else {
                            instructor.returnJson(res, profile._id);
                        }
                    }
                );
            }
        });
    } else {
        res.send(400, {
            message: 'Only a fellow\'s work history can be added'
        });
    }
};

/**
 * Admin edits fellow's work history
 */
exports.editPlacement = function(req, res) {
    var placement = req.placement,
        profile = req.profile;

    placement = _.extend(placement, req.body);

    Applicant.update({
            _id: profile._id,
            'placements._id': placement._id
        }, {
            $set: {
                'placements.$.company': placement.company,
                'placements.$.jobDescription': placement.jobDescription,
                'placements.$.location': placement.location,
                'placements.$.start_date': placement.start_date,
                'placements.$.end_date': placement.end_date
            }
        },
        function(err) {
            if (err) {
                res.send(500, {
                    message: 'error occurred trying to update placement'
                });
            } else {
                instructor.returnJson(res, profile._id);
            }
        }
    );
};

/**
 * A particular work history extracted from the whole set and all placements
 */
exports.getPlacement = function(req, res) {
    res.jsonp(req.placement);
};

exports.getPlacements = function(req, res) {
    res.jsonp(req.profile.placements);
};

/**
 * Admin deletes a particular work placement from the whole set
 */
exports.deletePlacement = function(req, res) {
    var profile = req.profile,
        placement = req.placement;

    Applicant.update({
        _id: profile._id
    }, {
        $pull: {
            'placements': {
                '_id': placement._id
            }
        }
    }, function(err) {
        if (err) {
            res.send(500, {
                message: 'Couldn\'t delete placement'
            });
        } else {
            instructor.returnJson(res, profile._id);
        }
    });
};

/**
 * Download CV
 */
exports.download = function(req, res) {
    var file = req.param('file'),
        fileName = path.basename(file);

    res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
    res.download(file);
};

/**
 * List of Tests
 */
exports.listTests = function(req, res) {
    Test.find().sort('-created').exec(function(err, tests) {
        if (err) {
            res.send(500, {
                message: 'could not list test'
            });
        } else {
            res.jsonp(tests);
        }
    });
};

/**
 * Show the current test
 */
exports.testRead = function(req, res) {
    res.jsonp(req.test);
};

/**
 * Skills
 */
exports.listSkillCategories = function(req, res) {
    SkillCategory.find().sort('-created').exec(function(err, skillCategories) {
        if (err) {
            res.send(500, {
                message: 'could not list skillCategories'
            });
        } else {
            res.jsonp(skillCategories);
        }
    });
};

exports.createSkillCategory = function(req, res) {
    var skillCategory = new SkillCategory(req.body);
    skillCategory.save(function(err, category) {
        if (err) {
            res.send(500, {
                message: 'Couldn\'t create skillCategory'
            });
        } else {
            res.jsonp(category);
        }
    });
};

exports.getSkillCategory = function(req, res) {
    res.jsonp(req.skillCategory);
};

exports.updateSkillCategory = function(req, res) {
    SkillCategory.update({
            _id: req.skillCategory._id
        }, {
            $set: {
                name: req.body.name
            }
        },
        function(err) {
            if (err) {
                res.send(500, {
                    message: 'error occurred trying to update skill category'
                });
            } else {
                req.skillCategory.name = req.body.name;
                res.jsonp(req.skillCategory);
            }
        }
    );
};

exports.listSkills = function(req, res) {
    Skill.find().populate('category').exec(function(err, skills) {
        if (err) {
            res.send(500, {
                message: 'could not list skillCategories'
            });
        } else {
            res.jsonp(skills);
        }
    });
};

exports.listSkillsByCategory = function(req, res) {
    Skill.find().where('category').equals(req.skillCategory._id).exec(function(err, skills) {
        if (err) {
            res.send(500, {
                message: 'could not list skills'
            });
        } else {
            res.jsonp(skills);
        }
    });
};

exports.createSkill = function(req, res) {
    var skill = new Skill({
        name: req.body.name,
        category: req.skillCategory._id
    });
    skill.save(function(err, skill) {
        if (err) {
            res.send(500, {
                message: 'Couldn\'t create skill'
            });
        } else {
            res.jsonp(skill);
        }
    });
};

exports.deleteSkillCategory = function(req, res) {
    SkillCategory.remove(function(err, skillCategory) {
        if (err) {
            res.send(500, {
                message: 'Couldn\'t delete category'
            });
        } else {
            res.jsonp(skillCategory);
        }
    });
};


/****************************** MIDDLEWARE ******************************************/


/**
 * Admin authorization middleware
 */
exports.checkPermission = function(req, res, next) {
    if (req.user._type === 'Instructor' && req.user.role === 'admin') {
        next();
    } else {
        res.send(403, {
            message: 'You are not an Admin'
        });
    }
};

/**
 * Applicant middleware
 */
exports.applicantByID = function(req, res, next, id) {
    Applicant.findById(id).where({
        _type: 'Applicant'
    }).populate('placements').populate('skillSet.skill').exec(function(err, user) {
        if (err) return next(err);
        if (!user) return next(new Error('User is not an applicant, trainee or fellow'));
        Placement.populate(user.placements, {
                path: 'placement'
            },
            function(err, data) {
                req.applicant = user;
                next();
            }
        );
    });
};

/**
 * Instructor middleware
 */
exports.instructorByID = function(req, res, next, id) {
    Instructor.findById(id).where({
        _type: 'Instructor'
    }).exec(function(err, user) {
        if (err) return next(err);
        if (!user) return next(new Error('User is not an instructor or admin'));
        req.instructor = user;
        next();
    });
};

/**
 * Bootcamp middleware
 */
exports.campByID = function(req, res, next, id) {
    Bootcamp.findById(id).populate('applicants').exec(function(err, camp) {
        if (err) return next(err);
        if (!camp) return next(new Error('Failed to load bootcamp ' + id));
        Applicant.populate(camp.applicants, {
            path: 'status'
        }, function(err, data) {
            req.camp = camp;
            next();
        });
    });
};

/**
 * Test middleware
 */
exports.testByID = function(req, res, next, id) {
    Test.findById(id).exec(function(err, test) {
        if (err) return next(err);
        if (!test) return next(new Error('Failed to load test ' + id));
        req.test = test;
        next();
    });
};

/**
 * Work History middleware
 */
exports.placementByID = function(req, res, next, id) {
    req.placement = req.profile.placement.id(id);
    next();
};

/**
 * Question middleware
 */
exports.questionByID = function(req, res, next, id) {
    req.question = req.test.questions.id(id);
    next();
};

/**
 * SKill Category middleware
 */
exports.skillCategoryByID = function(req, res, next, id) {
    SkillCategory.findById(id).exec(function(err, skillCategory) {
        if (err) return next(err);
        if (!skillCategory) return next(new Error('Failed to load category ' + id));
        req.skillCategory = skillCategory;
        next();
    });
};

/**
 * SKill middleware
 */
exports.skillById = function(req, res, next, id) {
    Skill.findById(id).populate('category').exec(function(err, skill) {
        if (err) return next(err);
        if (!skill) return next(new Error('Failed to load skill ' + id));
        req.skill = skill;
        next();
    });
};
