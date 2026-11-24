"""Worked example: clips written as code, on the rig they will play on.

    blender -b --python example_clips.py -- model.blend

Writes two looping actions on a biped with Mixamo bone names, at 30 frames a second:
  idle  2 s: breathing and a small turn of the head, feet still
  walk  1 s: exactly two footsteps, walking on the spot
Every frame starts from the rest pose and the last frame repeats the first, so the loops close.

The walk keeps its planted foot on the floor without IK, by construction: while a foot is down it
travels back in a straight line at a constant speed, the leg angle is worked out from that, the foot is
turned back level, and the hips drop by exactly what the slanted leg loses in height. The script prints
the speed the game must move the character at for the feet not to slide. Copy the pattern for other
clips: poses as moves from the rest pose, a limit on every joint, then check_clips.py for the numbers.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy

import common
from pose_test import BACK, UP, move, rest

FPS = 30
ACROSS = (1, 0, 0)        # turning a hanging leg about +x swings it backward
STRIDE_ANGLE = 24.0       # degrees the leg reaches forward and back
LIMITS = {"Head": 70, "Spine": 30, "Spine2": 30, "LeftLeg": 150, "RightLeg": 150}  # degrees a joint may turn in one move


def clamp(step):
    limit = LIMITS.get(step["bone"], 120)
    return {**step, "degrees": max(-limit, min(limit, step["degrees"]))}


def leg_length(rig):
    return (rig.pose.bones["LeftUpLeg"].head - rig.pose.bones["LeftFoot"].head).length


def walk_speed(rig):
    """Metres a second the game must move the character for this walk's feet to stay put."""
    return 4 * leg_length(rig) * math.sin(math.radians(STRIDE_ANGLE))  # two strides of 2 x reach, in 1 s


def walk_for(rig):
    length = leg_length(rig)
    reach = length * math.sin(math.radians(STRIDE_ANGLE))

    def walk(t):
        moves, drop = [], 0.0
        for side, offset in (("Left", 0.0), ("Right", 0.5)):
            phase = (t + offset) % 1
            if phase < 0.5:  # planted: the foot goes from `reach` ahead to `reach` behind at a constant speed
                ahead, knee = reach * (1 - 4 * phase), 0.0
                drop = length * (1 - math.cos(math.asin(ahead / length)))
            else:            # in the air: it comes back to the front, eased. The knee folds early and is straight again
                             # before the leg is forward: a bent knee under a forward thigh pushes the foot through the floor
                swing = (phase - 0.5) * 2
                ahead, knee = reach * (-1 + 2 * (0.5 - 0.5 * math.cos(swing * math.pi))), math.sin(math.pi * min(1.0, swing / 0.7)) ** 0.5 * 44
            thigh = math.degrees(math.asin(ahead / length))
            moves += [{"bone": f"{side}UpLeg", "about": ACROSS, "degrees": -thigh}, {"bone": f"{side}Leg", "about": ACROSS, "degrees": knee},
                      {"bone": f"{side}Foot", "about": ACROSS, "degrees": thigh - knee},  # turn the foot back level
                      {"bone": f"{side}Arm", "about": ACROSS, "degrees": -thigh * 0.6}]
        moves[3]["degrees"], moves[7]["degrees"] = moves[7]["degrees"], moves[3]["degrees"]  # arms swing against the legs
        moves.append({"bone": "Spine", "about": UP, "degrees": math.sin(t * math.tau) * 4})
        return moves, -drop

    return walk


def idle(t):
    breathe = math.sin(t * math.tau)
    return [{"bone": "Spine2", "toward": BACK, "degrees": 1.5 + breathe * 1.5}, {"bone": "Head", "about": UP, "degrees": breathe * 4},
            {"bone": "LeftArm", "about": ACROSS, "degrees": breathe * 2}, {"bone": "RightArm", "about": ACROSS, "degrees": -breathe * 2}], 0.0


def write(rig, name, frames, pose_at):
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    rig.animation_data_create()
    rig.animation_data.action = action
    for bone in rig.pose.bones:
        bone.rotation_mode = "QUATERNION"
    for frame in range(frames + 1):  # frame `frames` repeats frame 0, so the loop closes
        rest(rig)
        moves, hip_offset = pose_at((frame % frames) / frames)
        for step in moves:
            move(rig, clamp(step))
        hips = rig.pose.bones.get("Hips")
        if hips:
            hips.location.y += hip_offset  # a bone's own y axis runs along its length: up, for the hips
        for bone in rig.pose.bones:
            bone.keyframe_insert("rotation_quaternion", frame=frame + 1)
        if hips:
            hips.keyframe_insert("location", frame=frame + 1)
    rest(rig)
    return action


def main(argv):
    common.load(argv[0])
    rig = common.armature()
    bpy.context.scene.render.fps = FPS
    rest(rig)
    speed = round(walk_speed(rig), 3)
    names = [write(rig, "idle", 2 * FPS, idle).name, write(rig, "walk", FPS, walk_for(rig)).name]
    rig.animation_data.action = None
    common.save(argv[0])
    print(f"clips: {names}; move the character at {speed} m/s while walk plays")
    return {"clips": names, "walk_speed": speed}


if __name__ == "__main__":
    main(common.args())
